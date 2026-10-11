-- Mẫu: bảng có mã dạng text giữ số 0 đầu.
CREATE TABLE sample_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  weight_100g integer CHECK (weight_100g >= 0),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER sample_item_updated BEFORE UPDATE ON sample_item
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
