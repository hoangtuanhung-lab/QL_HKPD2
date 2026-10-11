-- Mẫu: thay đổi cộng thêm (expand), không phá.
ALTER TABLE sample_item ADD COLUMN note text;
CREATE TABLE sample_child (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES sample_item(id) ON DELETE RESTRICT
);
