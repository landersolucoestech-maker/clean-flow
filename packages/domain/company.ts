import type { EntityId } from "./identity";

export type CompanyProfile=Readonly<{
  id:EntityId;
  legalName:string;
  tradeName:string;
  timezone:string;
  locale:"en-US"|"es-US"|"pt-BR";
  currency:"USD";
  phone?:string;
  email?:string;
  website?:string;
}>;
