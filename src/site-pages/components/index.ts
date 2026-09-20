/** Components the site pages can place at slots, by name (see `../slots`). */
import { SupportersGrid } from "./supporters";
import { AppGallery } from "./apps";
import { IntegrationList } from "./integrations";
import { ContactBlock } from "./contact";
import { ContributorDirectory } from "./contributors";
import { CiteMacrostrat, Bibliography } from "./publications";
import { RepositoryList } from "./repositories";

export const siteComponents: Record<string, any> = {
  SupportersGrid,
  AppGallery,
  IntegrationList,
  ContactBlock,
  ContributorDirectory,
  CiteMacrostrat,
  Bibliography,
  RepositoryList,
};
