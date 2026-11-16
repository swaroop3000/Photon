#!/usr/bin/env python3
"""Photon 3.4 local Primer3 engine: JSON request -> JSON result.

Install in a Python venv: python -m pip install 'primer3-py==2.4.0'
Run: python scripts/primer3_runner.py request.json result.json

No networking, uploaded sequences, hidden heuristic fallback or shell execution.
"""
import json
import math
import pathlib
import sys

REQUEST = "photon/primer3-request/1"
RESULT = "photon/primer3-result/1"


def integer(value, key, low, high):
    if isinstance(value, bool) or not isinstance(value, int) or not low <= value <= high:
        raise ValueError(f"Invalid {key}")
    return value


def validated_request(path):
    payload = json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
    if payload.get("format") != REQUEST or payload.get("engine") != "primer3-py-local":
        raise ValueError("Invalid Photon Primer3 request format")
    sequence = payload.get("sequence")
    if not isinstance(sequence, str) or not 40 <= len(sequence) <= 1_000_000:
        raise ValueError("Primer3 template must contain 40–1,000,000 bp")
    if any(ch not in "ACGT" for ch in sequence):
        raise ValueError("Primer3 template must contain uppercase A/C/G/T only")
    settings = payload.get("options", {})
    if not isinstance(settings, dict):
        raise ValueError("Invalid Primer3 settings")
    minimum = integer(settings.get("minProduct"), "minProduct", 30, 1_000_000)
    maximum = integer(settings.get("maxProduct"), "maxProduct", minimum, len(sequence))
    number = integer(settings.get("maxPairs"), "maxPairs", 1, 20)
    min_size = integer(settings.get("minSize"), "minSize", 15, 35)
    opt_size = integer(settings.get("optSize"), "optSize", min_size, 35)
    max_size = integer(settings.get("maxSize"), "maxSize", opt_size, 40)
    tm = []
    for key in ("minTm", "optTm", "maxTm"):
        value = settings.get(key)
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not 40 <= value <= 80:
            raise ValueError("Invalid " + key)
        tm.append(value)
    if tm != sorted(tm):
        raise ValueError("Tm constraints must be ordered")
    return payload, {
        "PRIMER_TASK": "generic",
        "PRIMER_PICK_LEFT_PRIMER": 1,
        "PRIMER_PICK_RIGHT_PRIMER": 1,
        "PRIMER_PICK_INTERNAL_OLIGO": 0,
        "PRIMER_NUM_RETURN": number,
        "PRIMER_MIN_SIZE": min_size,
        "PRIMER_OPT_SIZE": opt_size,
        "PRIMER_MAX_SIZE": max_size,
        "PRIMER_MIN_TM": tm[0],
        "PRIMER_OPT_TM": tm[1],
        "PRIMER_MAX_TM": tm[2],
        "PRIMER_PRODUCT_SIZE_RANGE": [[minimum, maximum]],
        "PRIMER_EXPLAIN_FLAG": 1,
    }


def run(request):
    try:
        import primer3
    except ImportError as exc:
        raise RuntimeError("Install the real Primer3 engine first: python -m pip install primer3-py==2.4.0") from exc
    payload, settings = validated_request(request)
    template = payload["sequence"]
    output = primer3.bindings.design_primers(
        {"SEQUENCE_ID": payload.get("name", "Photon"), "SEQUENCE_TEMPLATE": template},
        settings,
    )
    if output.get("PRIMER_ERROR"):
        raise ValueError("Primer3 rejected the requested design: " + str(output["PRIMER_ERROR"]))
    pairs = []
    count = integer(output.get("PRIMER_PAIR_NUM_RETURNED", 0), "returned pair count", 0, 20)
    for i in range(count):
        left_position, left_length = output[f"PRIMER_LEFT_{i}"]
        right_last_base, right_length = output[f"PRIMER_RIGHT_{i}"]
        pairs.append({
            "forward": {
                "sequence": output[f"PRIMER_LEFT_{i}_SEQUENCE"],
                "start": int(left_position),
                "tm": float(output[f"PRIMER_LEFT_{i}_TM"]),
            },
            "reverse": {
                "sequence": output[f"PRIMER_RIGHT_{i}_SEQUENCE"],
                "start": int(right_last_base) - int(right_length) + 1,
                "tm": float(output[f"PRIMER_RIGHT_{i}_TM"]),
            },
            "productSize": int(output[f"PRIMER_PAIR_{i}_PRODUCT_SIZE"]),
            "pairPenalty": float(output[f"PRIMER_PAIR_{i}_PENALTY"]),
        })
    return {
        "format": RESULT,
        "engine": "primer3-py",
        "engineVersion": str(getattr(primer3, "__version__", "unknown")),
        "template": template,
        "name": str(payload.get("name", "Photon")),
        "pairs": pairs,
        "explain": "; ".join(str(output.get(k, "")) for k in
                             ("PRIMER_LEFT_EXPLAIN", "PRIMER_RIGHT_EXPLAIN", "PRIMER_PAIR_EXPLAIN")
                             if k in output),
    }


def main(argv):
    if len(argv) != 3:
        raise SystemExit("Usage: python scripts/primer3_runner.py request.json result.json")
    result = run(argv[1])
    pathlib.Path(argv[2]).write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(f"Primer3 returned {len(result['pairs'])} candidate pairs.")


if __name__ == "__main__":
    try:
        main(sys.argv)
    except (ValueError, KeyError, RuntimeError) as error:
        print("Primer3 run failed:", error, file=sys.stderr)
        sys.exit(1)
