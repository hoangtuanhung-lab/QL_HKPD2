-- Mô phỏng migration "thành công nhưng phá dữ liệu": xóa dữ liệu và sửa mã.
DELETE FROM sample_child;
UPDATE sample_item SET code = ltrim(replace(code, '.', ''), '0');
DROP TABLE sample_child;
