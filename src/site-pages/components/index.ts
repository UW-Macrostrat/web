/** Components the site pages can place at slots, by name (see `../slots`). */
import { SupportersGrid } from "./supporters";
import { AppGallery } from "./apps";
import { IntegrationList, ProviderList } from "./integrations";
import { ContactBlock } from "./contact";
import { ContributorDirectory } from "./contributors";
import { Bibliography, BibliographySummary } from "./publications";

export const siteComponents: Record<string, any> = {
  SupportersGrid,
  AppGallery,
  IntegrationList,
  ProviderList,
  ContactBlock,
  ContributorDirectory,
  Bibliography,
  BibliographySummary,
};
