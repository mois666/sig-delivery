export interface ICity {
  id:          number;
  name:        string;
  country:     string;
  currency:    string;
  coordinates?: any;
  is_active?:  boolean;
}
