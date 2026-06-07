export type Client = {
  id: string;
  name: string;
  meta_account_id: string;
  niche: string | null;
  currency: string | null;
  gross_margin: number;
  agency_fee_monthly: number | null;
  created_at: string;
};

export type ClientBrain = {
  client_id: string;
  audience: string | null;
  language: string | null;
  tone: string | null;
  offers: string[];
  brand_md: string | null;
};
