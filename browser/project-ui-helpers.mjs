import {settled} from './storage-helpers.mjs';
export async function createExampleProject(page,name='Example_DNA'){
 await page.locator('#photonNewProject').click();await page.locator('#photonUseExample').click();
 await page.locator('#projectName').fill(name);await page.locator('#photonCreateProject').click();await settled(page);
}
