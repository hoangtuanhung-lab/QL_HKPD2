-- Mô phỏng migration lỗi giữa chừng: câu đầu thành công, câu sau lỗi.
UPDATE sample_item SET note = 'bị sửa bởi migration lỗi';
CREATE TABLE sample_faulty (id uuid PRIMARY KEY);
SELECT 1/0;
