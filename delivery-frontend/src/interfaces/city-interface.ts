export interface ICity {
  id:          number;
  name:        string;
  country:     string;
  currency:    string;
  timezone:    string;
  center_lat:  number;
  center_lng:  number;
  coordinates?: any; // PostGIS geometry object represented as GeoJSON (e.g. { type: 'Polygon', coordinates: [...] })
  is_active:   boolean;
  metadata?:   any;
  created_at?: string;
  updated_at?: string;
}
