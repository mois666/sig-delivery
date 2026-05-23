export interface ICity {
  id:          number;
  name:        string;
  country:     string;
  currency:    string;
  timezone:    string;
  coordinates: [number, number][]; // Array of points [[lat, lng], [lat, lng]...]
  is_active:   boolean;
  created_at?: string;
  updated_at?: string;
}
