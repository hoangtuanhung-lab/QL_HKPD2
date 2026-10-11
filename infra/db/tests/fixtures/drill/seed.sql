-- Dữ liệu giả cho diễn tập recovery trên bộ migration mẫu.
INSERT INTO sample_item (code, weight_100g, note) VALUES ('01.012', 355, 'giả'), ('01.013', 400, 'giả'), ('02.001', NULL, 'giả');
INSERT INTO sample_child (item_id) SELECT id FROM sample_item WHERE code = '01.012';
