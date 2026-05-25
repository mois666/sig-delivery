export interface ICity {
  id:                 number;
  name:               string;
  country:            string;
  currency:           string;
  base_delivery_fee?: number | string;
  center_lat_lng?:    string;
  is_active?:         boolean;
  created_at?:        string;
  updated_at?:        string;
}
