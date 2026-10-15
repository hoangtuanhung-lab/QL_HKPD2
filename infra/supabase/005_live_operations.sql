-- Owner-run after 001..004. Current edition is deliberately pinned to 2026.
begin;
create table if not exists public.hkpd_catalog_details(code text primary key references public.hkpd_official_catalog(code), detail jsonb not null);
-- BEGIN GENERATED CATALOG
insert into public.hkpd_catalog_details(code, detail) values
('DK_TH_NAM_TC_60M', '{"sourceRow":2,"level":"TH","code":"DK_TH_NAM_TC_60M","sportCode":"DK","sportName":"Điền kinh","gender":"Nam","group":null,"name":"Chạy 60m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/đơn vị"}'::jsonb),
('DK_TH_NAM_TC_BATXA', '{"sourceRow":3,"level":"TH","code":"DK_TH_NAM_TC_BATXA","sportCode":"DK","sportName":"Điền kinh","gender":"Nam","group":null,"name":"Bật xa tại chỗ","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/đơn vị"}'::jsonb),
('DK_TH_NAM_TC_TS4X50', '{"sourceRow":4,"level":"TH","code":"DK_TH_NAM_TC_TS4X50","sportCode":"DK","sportName":"Điền kinh","gender":"Nam","group":null,"name":"Chạy tiếp sức 4 x 50m","form":"TIEP_SUC","teamSize":"4","quota":"1 đội/đơn vị (giả định)"}'::jsonb),
('DK_TH_NU_TC_60M', '{"sourceRow":5,"level":"TH","code":"DK_TH_NU_TC_60M","sportCode":"DK","sportName":"Điền kinh","gender":"Nữ","group":null,"name":"Chạy 60m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/đơn vị"}'::jsonb),
('DK_TH_NU_TC_BATXA', '{"sourceRow":6,"level":"TH","code":"DK_TH_NU_TC_BATXA","sportCode":"DK","sportName":"Điền kinh","gender":"Nữ","group":null,"name":"Bật xa tại chỗ","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/đơn vị"}'::jsonb),
('DK_TH_NU_TC_TS4X50', '{"sourceRow":7,"level":"TH","code":"DK_TH_NU_TC_TS4X50","sportCode":"DK","sportName":"Điền kinh","gender":"Nữ","group":null,"name":"Chạy tiếp sức 4 x 50m","form":"TIEP_SUC","teamSize":"4","quota":"1 đội/đơn vị (giả định)"}'::jsonb),
('BOI_TH_NAM_0709_TUDO50', '{"sourceRow":8,"level":"TH","code":"BOI_TH_NAM_0709_TUDO50","sportCode":"BOI","sportName":"Bơi","gender":"Nam","group":"6 - 8 tuổi","name":"Bơi tự do 50m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_TH_NAM_0709_TUDO100', '{"sourceRow":9,"level":"TH","code":"BOI_TH_NAM_0709_TUDO100","sportCode":"BOI","sportName":"Bơi","gender":"Nam","group":"6 - 8 tuổi","name":"Bơi tự do 100m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_TH_NAM_0709_ECH50', '{"sourceRow":10,"level":"TH","code":"BOI_TH_NAM_0709_ECH50","sportCode":"BOI","sportName":"Bơi","gender":"Nam","group":"6 - 8 tuổi","name":"Bơi ếch 50m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_TH_NAM_0709_ECH100', '{"sourceRow":11,"level":"TH","code":"BOI_TH_NAM_0709_ECH100","sportCode":"BOI","sportName":"Bơi","gender":"Nam","group":"6 - 8 tuổi","name":"Bơi ếch 100m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_TH_NU_0709_TUDO50', '{"sourceRow":12,"level":"TH","code":"BOI_TH_NU_0709_TUDO50","sportCode":"BOI","sportName":"Bơi","gender":"Nữ","group":"6 - 8 tuổi","name":"Bơi tự do 50m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_TH_NU_0709_TUDO100', '{"sourceRow":13,"level":"TH","code":"BOI_TH_NU_0709_TUDO100","sportCode":"BOI","sportName":"Bơi","gender":"Nữ","group":"6 - 8 tuổi","name":"Bơi tự do 100m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_TH_NU_0709_ECH50', '{"sourceRow":14,"level":"TH","code":"BOI_TH_NU_0709_ECH50","sportCode":"BOI","sportName":"Bơi","gender":"Nữ","group":"6 - 8 tuổi","name":"Bơi ếch 50m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_TH_NU_0709_ECH100', '{"sourceRow":15,"level":"TH","code":"BOI_TH_NU_0709_ECH100","sportCode":"BOI","sportName":"Bơi","gender":"Nữ","group":"6 - 8 tuổi","name":"Bơi ếch 100m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_TH_NAM_1011_TUDO50', '{"sourceRow":16,"level":"TH","code":"BOI_TH_NAM_1011_TUDO50","sportCode":"BOI","sportName":"Bơi","gender":"Nam","group":"9 - 10 tuổi","name":"Bơi tự do 50m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_TH_NAM_1011_TUDO100', '{"sourceRow":17,"level":"TH","code":"BOI_TH_NAM_1011_TUDO100","sportCode":"BOI","sportName":"Bơi","gender":"Nam","group":"9 - 10 tuổi","name":"Bơi tự do 100m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_TH_NAM_1011_ECH50', '{"sourceRow":18,"level":"TH","code":"BOI_TH_NAM_1011_ECH50","sportCode":"BOI","sportName":"Bơi","gender":"Nam","group":"9 - 10 tuổi","name":"Bơi ếch 50m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_TH_NAM_1011_ECH100', '{"sourceRow":19,"level":"TH","code":"BOI_TH_NAM_1011_ECH100","sportCode":"BOI","sportName":"Bơi","gender":"Nam","group":"9 - 10 tuổi","name":"Bơi ếch 100m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_TH_NU_1011_TUDO50', '{"sourceRow":20,"level":"TH","code":"BOI_TH_NU_1011_TUDO50","sportCode":"BOI","sportName":"Bơi","gender":"Nữ","group":"9 - 10 tuổi","name":"Bơi tự do 50m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_TH_NU_1011_TUDO100', '{"sourceRow":21,"level":"TH","code":"BOI_TH_NU_1011_TUDO100","sportCode":"BOI","sportName":"Bơi","gender":"Nữ","group":"9 - 10 tuổi","name":"Bơi tự do 100m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_TH_NU_1011_ECH50', '{"sourceRow":22,"level":"TH","code":"BOI_TH_NU_1011_ECH50","sportCode":"BOI","sportName":"Bơi","gender":"Nữ","group":"9 - 10 tuổi","name":"Bơi ếch 50m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_TH_NU_1011_ECH100', '{"sourceRow":23,"level":"TH","code":"BOI_TH_NU_1011_ECH100","sportCode":"BOI","sportName":"Bơi","gender":"Nữ","group":"9 - 10 tuổi","name":"Bơi ếch 100m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_TH_HON_HOP_TC_TS4X50', '{"sourceRow":24,"level":"TH","code":"BOI_TH_HON_HOP_TC_TS4X50","sportCode":"BOI","sportName":"Bơi","gender":"Nam - nữ","group":"Cả cấp","name":"Bơi tiếp sức tự do 4 x 50m (2 nam, 2 nữ)","form":"TIEP_SUC","teamSize":"4","quota":"1 đội/cấp/đơn vị"}'::jsonb),
('DC_TH_NAM_0709_DONNAM', '{"sourceRow":25,"level":"TH","code":"DC_TH_NAM_0709_DONNAM","sportCode":"DC","sportName":"Đá cầu","gender":"Nam","group":"6 - 8 tuổi","name":"Đơn nam","form":"CA_NHAN","teamSize":"2","quota":"Tối đa 2 VĐV/đơn vị"}'::jsonb),
('DC_TH_NU_0709_DONNU', '{"sourceRow":26,"level":"TH","code":"DC_TH_NU_0709_DONNU","sportCode":"DC","sportName":"Đá cầu","gender":"Nữ","group":"6 - 8 tuổi","name":"Đơn nữ","form":"CA_NHAN","teamSize":"2","quota":"Tối đa 2 VĐV/đơn vị"}'::jsonb),
('DC_TH_NAM_0709_DOINAM', '{"sourceRow":27,"level":"TH","code":"DC_TH_NAM_0709_DOINAM","sportCode":"DC","sportName":"Đá cầu","gender":"Nam","group":"6 - 8 tuổi","name":"Đôi nam","form":"DOI","teamSize":"2","quota":"1 đôi/đơn vị"}'::jsonb),
('DC_TH_NU_0709_DOINU', '{"sourceRow":28,"level":"TH","code":"DC_TH_NU_0709_DOINU","sportCode":"DC","sportName":"Đá cầu","gender":"Nữ","group":"6 - 8 tuổi","name":"Đôi nữ","form":"DOI","teamSize":"2","quota":"1 đôi/đơn vị"}'::jsonb),
('DC_TH_HON_HOP_0709_DOINAMNU', '{"sourceRow":29,"level":"TH","code":"DC_TH_HON_HOP_0709_DOINAMNU","sportCode":"DC","sportName":"Đá cầu","gender":"Nam - nữ","group":"6 - 8 tuổi","name":"Đôi nam - nữ","form":"DOI","teamSize":"2","quota":"1 đôi/đơn vị"}'::jsonb),
('DC_TH_NAM_1011_DONNAM', '{"sourceRow":30,"level":"TH","code":"DC_TH_NAM_1011_DONNAM","sportCode":"DC","sportName":"Đá cầu","gender":"Nam","group":"9 - 10 tuổi","name":"Đơn nam","form":"CA_NHAN","teamSize":"1","quota":"Tối đa 2 VĐV/đơn vị"}'::jsonb),
('DC_TH_NU_1011_DONNU', '{"sourceRow":31,"level":"TH","code":"DC_TH_NU_1011_DONNU","sportCode":"DC","sportName":"Đá cầu","gender":"Nữ","group":"9 - 10 tuổi","name":"Đơn nữ","form":"CA_NHAN","teamSize":"1","quota":"Tối đa 2 VĐV/đơn vị"}'::jsonb),
('DC_TH_NAM_1011_DOINAM', '{"sourceRow":32,"level":"TH","code":"DC_TH_NAM_1011_DOINAM","sportCode":"DC","sportName":"Đá cầu","gender":"Nam","group":"9 - 10 tuổi","name":"Đôi nam","form":"DOI","teamSize":"2","quota":"1 đôi/đơn vị"}'::jsonb),
('DC_TH_NU_1011_DOINU', '{"sourceRow":33,"level":"TH","code":"DC_TH_NU_1011_DOINU","sportCode":"DC","sportName":"Đá cầu","gender":"Nữ","group":"9 - 10 tuổi","name":"Đôi nữ","form":"DOI","teamSize":"2","quota":"1 đôi/đơn vị"}'::jsonb),
('DC_TH_HON_HOP_1011_DOINAMNU', '{"sourceRow":34,"level":"TH","code":"DC_TH_HON_HOP_1011_DOINAMNU","sportCode":"DC","sportName":"Đá cầu","gender":"Nam - nữ","group":"9 - 10 tuổi","name":"Đôi nam - nữ","form":"DOI","teamSize":"2","quota":"1 đôi/đơn vị"}'::jsonb),
('CV_TH_NAM_0709_CANHAN', '{"sourceRow":35,"level":"TH","code":"CV_TH_NAM_0709_CANHAN","sportCode":"CV","sportName":"Cờ vua","gender":"Nam","group":"6 - 8 tuổi","name":"Cờ vua cá nhân","form":"CA_NHAN","teamSize":"4","quota":"Tối đa 4 VĐV nam, 4 VĐV nữ (phạm vi tính chưa rõ)"}'::jsonb),
('CV_TH_NU_0709_CANHAN', '{"sourceRow":36,"level":"TH","code":"CV_TH_NU_0709_CANHAN","sportCode":"CV","sportName":"Cờ vua","gender":"Nữ","group":"6 - 8 tuổi","name":"Cờ vua cá nhân","form":"CA_NHAN","teamSize":"4","quota":"Tối đa 4 VĐV nam, 4 VĐV nữ (phạm vi tính chưa rõ)"}'::jsonb),
('CV_TH_NAM_1011_CANHAN', '{"sourceRow":37,"level":"TH","code":"CV_TH_NAM_1011_CANHAN","sportCode":"CV","sportName":"Cờ vua","gender":"Nam","group":"9 - 10 tuổi","name":"Cờ vua cá nhân","form":"CA_NHAN","teamSize":"4","quota":"Tối đa 4 VĐV nam, 4 VĐV nữ (phạm vi tính chưa rõ)"}'::jsonb),
('CV_TH_NU_1011_CANHAN', '{"sourceRow":38,"level":"TH","code":"CV_TH_NU_1011_CANHAN","sportCode":"CV","sportName":"Cờ vua","gender":"Nữ","group":"9 - 10 tuổi","name":"Cờ vua cá nhân","form":"CA_NHAN","teamSize":"4","quota":"Tối đa 4 VĐV nam, 4 VĐV nữ (phạm vi tính chưa rõ)"}'::jsonb),
('BD_TH', '{"sourceRow":39,"level":"TH","code":"BD_TH","sportCode":"BD","sportName":"Bóng đá","gender":"Nam","group":"Cả cấp","name":"Bóng đá 5 người nam TH","form":"DONG_DOI","teamSize":"12","quota":"1 đội/đơn vị"}'::jsonb),
('DK_THCS_NAM_TC_100M', '{"sourceRow":40,"level":"THCS","code":"DK_THCS_NAM_TC_100M","sportCode":"DK","sportName":"Điền kinh","gender":"Nam","group":null,"name":"Chạy 100m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/đơn vị"}'::jsonb),
('DK_THCS_NAM_TC_200M', '{"sourceRow":41,"level":"THCS","code":"DK_THCS_NAM_TC_200M","sportCode":"DK","sportName":"Điền kinh","gender":"Nam","group":null,"name":"Chạy 200m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/đơn vị"}'::jsonb),
('DK_THCS_NAM_TC_1500M', '{"sourceRow":42,"level":"THCS","code":"DK_THCS_NAM_TC_1500M","sportCode":"DK","sportName":"Điền kinh","gender":"Nam","group":null,"name":"Chạy 1.500m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/đơn vị"}'::jsonb),
('DK_THCS_NAM_TC_NHAYXA', '{"sourceRow":43,"level":"THCS","code":"DK_THCS_NAM_TC_NHAYXA","sportCode":"DK","sportName":"Điền kinh","gender":"Nam","group":null,"name":"Nhảy xa","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/đơn vị"}'::jsonb),
('DK_THCS_NAM_TC_NHAYCAO', '{"sourceRow":44,"level":"THCS","code":"DK_THCS_NAM_TC_NHAYCAO","sportCode":"DK","sportName":"Điền kinh","gender":"Nam","group":null,"name":"Nhảy cao","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/đơn vị"}'::jsonb),
('DK_THCS_NAM_TC_TS4X100', '{"sourceRow":45,"level":"THCS","code":"DK_THCS_NAM_TC_TS4X100","sportCode":"DK","sportName":"Điền kinh","gender":"Nam","group":null,"name":"Chạy tiếp sức 4 x 100m","form":"TIEP_SUC","teamSize":"4","quota":"1 đội/đơn vị (giả định)"}'::jsonb),
('DK_THCS_NU_TC_100M', '{"sourceRow":46,"level":"THCS","code":"DK_THCS_NU_TC_100M","sportCode":"DK","sportName":"Điền kinh","gender":"Nữ","group":null,"name":"Chạy 100m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/đơn vị"}'::jsonb),
('DK_THCS_NU_TC_200M', '{"sourceRow":47,"level":"THCS","code":"DK_THCS_NU_TC_200M","sportCode":"DK","sportName":"Điền kinh","gender":"Nữ","group":null,"name":"Chạy 200m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/đơn vị"}'::jsonb),
('DK_THCS_NU_TC_800M', '{"sourceRow":48,"level":"THCS","code":"DK_THCS_NU_TC_800M","sportCode":"DK","sportName":"Điền kinh","gender":"Nữ","group":null,"name":"Chạy 800m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/đơn vị"}'::jsonb),
('DK_THCS_NU_TC_NHAYXA', '{"sourceRow":49,"level":"THCS","code":"DK_THCS_NU_TC_NHAYXA","sportCode":"DK","sportName":"Điền kinh","gender":"Nữ","group":null,"name":"Nhảy xa","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/đơn vị"}'::jsonb),
('DK_THCS_NU_TC_NHAYCAO', '{"sourceRow":50,"level":"THCS","code":"DK_THCS_NU_TC_NHAYCAO","sportCode":"DK","sportName":"Điền kinh","gender":"Nữ","group":null,"name":"Nhảy cao","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/đơn vị"}'::jsonb),
('DK_THCS_NU_TC_TS4X100', '{"sourceRow":51,"level":"THCS","code":"DK_THCS_NU_TC_TS4X100","sportCode":"DK","sportName":"Điền kinh","gender":"Nữ","group":null,"name":"Chạy tiếp sức 4 x 100m","form":"TIEP_SUC","teamSize":"4","quota":"1 đội/đơn vị (giả định)"}'::jsonb),
('BOI_THCS_NAM_1213_TUDO50', '{"sourceRow":52,"level":"THCS","code":"BOI_THCS_NAM_1213_TUDO50","sportCode":"BOI","sportName":"Bơi","gender":"Nam","group":"11 - 12 tuổi","name":"Bơi tự do 50m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_THCS_NAM_1213_TUDO100', '{"sourceRow":53,"level":"THCS","code":"BOI_THCS_NAM_1213_TUDO100","sportCode":"BOI","sportName":"Bơi","gender":"Nam","group":"11 - 12 tuổi","name":"Bơi tự do 100m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_THCS_NAM_1213_TUDO200', '{"sourceRow":54,"level":"THCS","code":"BOI_THCS_NAM_1213_TUDO200","sportCode":"BOI","sportName":"Bơi","gender":"Nam","group":"11 - 12 tuổi","name":"Bơi tự do 200m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_THCS_NAM_1213_ECH50', '{"sourceRow":55,"level":"THCS","code":"BOI_THCS_NAM_1213_ECH50","sportCode":"BOI","sportName":"Bơi","gender":"Nam","group":"11 - 12 tuổi","name":"Bơi ếch 50m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_THCS_NAM_1213_ECH100', '{"sourceRow":56,"level":"THCS","code":"BOI_THCS_NAM_1213_ECH100","sportCode":"BOI","sportName":"Bơi","gender":"Nam","group":"11 - 12 tuổi","name":"Bơi ếch 100m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_THCS_NAM_1213_ECH200', '{"sourceRow":57,"level":"THCS","code":"BOI_THCS_NAM_1213_ECH200","sportCode":"BOI","sportName":"Bơi","gender":"Nam","group":"11 - 12 tuổi","name":"Bơi ếch 200m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_THCS_NU_1213_TUDO50', '{"sourceRow":58,"level":"THCS","code":"BOI_THCS_NU_1213_TUDO50","sportCode":"BOI","sportName":"Bơi","gender":"Nữ","group":"11 - 12 tuổi","name":"Bơi tự do 50m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_THCS_NU_1213_TUDO100', '{"sourceRow":59,"level":"THCS","code":"BOI_THCS_NU_1213_TUDO100","sportCode":"BOI","sportName":"Bơi","gender":"Nữ","group":"11 - 12 tuổi","name":"Bơi tự do 100m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_THCS_NU_1213_TUDO200', '{"sourceRow":60,"level":"THCS","code":"BOI_THCS_NU_1213_TUDO200","sportCode":"BOI","sportName":"Bơi","gender":"Nữ","group":"11 - 12 tuổi","name":"Bơi tự do 200m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_THCS_NU_1213_ECH50', '{"sourceRow":61,"level":"THCS","code":"BOI_THCS_NU_1213_ECH50","sportCode":"BOI","sportName":"Bơi","gender":"Nữ","group":"11 - 12 tuổi","name":"Bơi ếch 50m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_THCS_NU_1213_ECH100', '{"sourceRow":62,"level":"THCS","code":"BOI_THCS_NU_1213_ECH100","sportCode":"BOI","sportName":"Bơi","gender":"Nữ","group":"11 - 12 tuổi","name":"Bơi ếch 100m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_THCS_NU_1213_ECH200', '{"sourceRow":63,"level":"THCS","code":"BOI_THCS_NU_1213_ECH200","sportCode":"BOI","sportName":"Bơi","gender":"Nữ","group":"11 - 12 tuổi","name":"Bơi ếch 200m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_THCS_NAM_1415_TUDO50', '{"sourceRow":64,"level":"THCS","code":"BOI_THCS_NAM_1415_TUDO50","sportCode":"BOI","sportName":"Bơi","gender":"Nam","group":"13 - 14 tuổi","name":"Bơi tự do 50m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_THCS_NAM_1415_TUDO100', '{"sourceRow":65,"level":"THCS","code":"BOI_THCS_NAM_1415_TUDO100","sportCode":"BOI","sportName":"Bơi","gender":"Nam","group":"13 - 14 tuổi","name":"Bơi tự do 100m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_THCS_NAM_1415_TUDO200', '{"sourceRow":66,"level":"THCS","code":"BOI_THCS_NAM_1415_TUDO200","sportCode":"BOI","sportName":"Bơi","gender":"Nam","group":"13 - 14 tuổi","name":"Bơi tự do 200m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_THCS_NAM_1415_ECH50', '{"sourceRow":67,"level":"THCS","code":"BOI_THCS_NAM_1415_ECH50","sportCode":"BOI","sportName":"Bơi","gender":"Nam","group":"13 - 14 tuổi","name":"Bơi ếch 50m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_THCS_NAM_1415_ECH100', '{"sourceRow":68,"level":"THCS","code":"BOI_THCS_NAM_1415_ECH100","sportCode":"BOI","sportName":"Bơi","gender":"Nam","group":"13 - 14 tuổi","name":"Bơi ếch 100m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_THCS_NAM_1415_ECH200', '{"sourceRow":69,"level":"THCS","code":"BOI_THCS_NAM_1415_ECH200","sportCode":"BOI","sportName":"Bơi","gender":"Nam","group":"13 - 14 tuổi","name":"Bơi ếch 200m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_THCS_NU_1415_TUDO50', '{"sourceRow":70,"level":"THCS","code":"BOI_THCS_NU_1415_TUDO50","sportCode":"BOI","sportName":"Bơi","gender":"Nữ","group":"13 - 14 tuổi","name":"Bơi tự do 50m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_THCS_NU_1415_TUDO100', '{"sourceRow":71,"level":"THCS","code":"BOI_THCS_NU_1415_TUDO100","sportCode":"BOI","sportName":"Bơi","gender":"Nữ","group":"13 - 14 tuổi","name":"Bơi tự do 100m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_THCS_NU_1415_TUDO200', '{"sourceRow":72,"level":"THCS","code":"BOI_THCS_NU_1415_TUDO200","sportCode":"BOI","sportName":"Bơi","gender":"Nữ","group":"13 - 14 tuổi","name":"Bơi tự do 200m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_THCS_NU_1415_ECH50', '{"sourceRow":73,"level":"THCS","code":"BOI_THCS_NU_1415_ECH50","sportCode":"BOI","sportName":"Bơi","gender":"Nữ","group":"13 - 14 tuổi","name":"Bơi ếch 50m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_THCS_NU_1415_ECH100', '{"sourceRow":74,"level":"THCS","code":"BOI_THCS_NU_1415_ECH100","sportCode":"BOI","sportName":"Bơi","gender":"Nữ","group":"13 - 14 tuổi","name":"Bơi ếch 100m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_THCS_NU_1415_ECH200', '{"sourceRow":75,"level":"THCS","code":"BOI_THCS_NU_1415_ECH200","sportCode":"BOI","sportName":"Bơi","gender":"Nữ","group":"13 - 14 tuổi","name":"Bơi ếch 200m","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/lứa tuổi/nội dung/đơn vị"}'::jsonb),
('BOI_THCS_HON_HOP_TC_TS4X100', '{"sourceRow":76,"level":"THCS","code":"BOI_THCS_HON_HOP_TC_TS4X100","sportCode":"BOI","sportName":"Bơi","gender":"Nam - nữ","group":"Cả cấp","name":"Bơi tiếp sức tự do 4 x 100m","form":"TIEP_SUC","teamSize":"4","quota":"1 đội/cấp/đơn vị"}'::jsonb),
('CL_THCS_NAM_1213_DONNAM', '{"sourceRow":77,"level":"THCS","code":"CL_THCS_NAM_1213_DONNAM","sportCode":"CL","sportName":"Cầu lông","gender":"Nam","group":"11 - 12 tuổi","name":"Đơn nam","form":"CA_NHAN","teamSize":"2","quota":"Tối đa 2 VĐV/đơn vị"}'::jsonb),
('CL_THCS_NU_1213_DONNU', '{"sourceRow":78,"level":"THCS","code":"CL_THCS_NU_1213_DONNU","sportCode":"CL","sportName":"Cầu lông","gender":"Nữ","group":"11 - 12 tuổi","name":"Đơn nữ","form":"CA_NHAN","teamSize":"2","quota":"Tối đa 2 VĐV/đơn vị"}'::jsonb),
('CL_THCS_NAM_1213_DOINAM', '{"sourceRow":79,"level":"THCS","code":"CL_THCS_NAM_1213_DOINAM","sportCode":"CL","sportName":"Cầu lông","gender":"Nam","group":"11 - 12 tuổi","name":"Đôi nam","form":"DOI","teamSize":"2","quota":"1 đôi/đơn vị"}'::jsonb),
('CL_THCS_NU_1213_DOINU', '{"sourceRow":80,"level":"THCS","code":"CL_THCS_NU_1213_DOINU","sportCode":"CL","sportName":"Cầu lông","gender":"Nữ","group":"11 - 12 tuổi","name":"Đôi nữ","form":"DOI","teamSize":"2","quota":"1 đôi/đơn vị"}'::jsonb),
('CL_THCS_HON_HOP_1213_DOINAMNU', '{"sourceRow":81,"level":"THCS","code":"CL_THCS_HON_HOP_1213_DOINAMNU","sportCode":"CL","sportName":"Cầu lông","gender":"Nam - nữ","group":"11 - 12 tuổi","name":"Đôi nam - nữ","form":"DOI","teamSize":"2","quota":"1 đôi/đơn vị"}'::jsonb),
('CL_THCS_NAM_1415_DONNAM', '{"sourceRow":82,"level":"THCS","code":"CL_THCS_NAM_1415_DONNAM","sportCode":"CL","sportName":"Cầu lông","gender":"Nam","group":"13 - 14 tuổi","name":"Đơn nam","form":"CA_NHAN","teamSize":"1","quota":"Tối đa 2 VĐV/đơn vị"}'::jsonb),
('CL_THCS_NU_1415_DONNU', '{"sourceRow":83,"level":"THCS","code":"CL_THCS_NU_1415_DONNU","sportCode":"CL","sportName":"Cầu lông","gender":"Nữ","group":"13 - 14 tuổi","name":"Đơn nữ","form":"CA_NHAN","teamSize":"1","quota":"Tối đa 2 VĐV/đơn vị"}'::jsonb),
('CL_THCS_NAM_1415_DOINAM', '{"sourceRow":84,"level":"THCS","code":"CL_THCS_NAM_1415_DOINAM","sportCode":"CL","sportName":"Cầu lông","gender":"Nam","group":"13 - 14 tuổi","name":"Đôi nam","form":"DOI","teamSize":"2","quota":"1 đôi/đơn vị"}'::jsonb),
('CL_THCS_NU_1415_DOINU', '{"sourceRow":85,"level":"THCS","code":"CL_THCS_NU_1415_DOINU","sportCode":"CL","sportName":"Cầu lông","gender":"Nữ","group":"13 - 14 tuổi","name":"Đôi nữ","form":"DOI","teamSize":"2","quota":"1 đôi/đơn vị"}'::jsonb),
('CL_THCS_HON_HOP_1415_DOINAMNU', '{"sourceRow":86,"level":"THCS","code":"CL_THCS_HON_HOP_1415_DOINAMNU","sportCode":"CL","sportName":"Cầu lông","gender":"Nam - nữ","group":"13 - 14 tuổi","name":"Đôi nam - nữ","form":"DOI","teamSize":"2","quota":"1 đôi/đơn vị"}'::jsonb),
('DC_THCS_NAM_1213_DONNAM', '{"sourceRow":87,"level":"THCS","code":"DC_THCS_NAM_1213_DONNAM","sportCode":"DC","sportName":"Đá cầu","gender":"Nam","group":"11 - 12 tuổi","name":"Đơn nam","form":"CA_NHAN","teamSize":"2","quota":"Tối đa 2 VĐV/đơn vị"}'::jsonb),
('DC_THCS_NU_1213_DONNU', '{"sourceRow":88,"level":"THCS","code":"DC_THCS_NU_1213_DONNU","sportCode":"DC","sportName":"Đá cầu","gender":"Nữ","group":"11 - 12 tuổi","name":"Đơn nữ","form":"CA_NHAN","teamSize":"2","quota":"Tối đa 2 VĐV/đơn vị"}'::jsonb),
('DC_THCS_NAM_1213_DOINAM', '{"sourceRow":89,"level":"THCS","code":"DC_THCS_NAM_1213_DOINAM","sportCode":"DC","sportName":"Đá cầu","gender":"Nam","group":"11 - 12 tuổi","name":"Đôi nam","form":"DOI","teamSize":"2","quota":"1 đôi/đơn vị"}'::jsonb),
('DC_THCS_NU_1213_DOINU', '{"sourceRow":90,"level":"THCS","code":"DC_THCS_NU_1213_DOINU","sportCode":"DC","sportName":"Đá cầu","gender":"Nữ","group":"11 - 12 tuổi","name":"Đôi nữ","form":"DOI","teamSize":"2","quota":"1 đôi/đơn vị"}'::jsonb),
('DC_THCS_HON_HOP_1213_DOINAMNU', '{"sourceRow":91,"level":"THCS","code":"DC_THCS_HON_HOP_1213_DOINAMNU","sportCode":"DC","sportName":"Đá cầu","gender":"Nam - nữ","group":"11 - 12 tuổi","name":"Đôi nam - nữ","form":"DOI","teamSize":"2","quota":"1 đôi/đơn vị"}'::jsonb),
('DC_THCS_NAM_1415_DONNAM', '{"sourceRow":92,"level":"THCS","code":"DC_THCS_NAM_1415_DONNAM","sportCode":"DC","sportName":"Đá cầu","gender":"Nam","group":"13 - 14 tuổi","name":"Đơn nam","form":"CA_NHAN","teamSize":"2","quota":"Tối đa 2 VĐV/đơn vị"}'::jsonb),
('DC_THCS_NU_1415_DONNU', '{"sourceRow":93,"level":"THCS","code":"DC_THCS_NU_1415_DONNU","sportCode":"DC","sportName":"Đá cầu","gender":"Nữ","group":"13 - 14 tuổi","name":"Đơn nữ","form":"CA_NHAN","teamSize":"2","quota":"Tối đa 2 VĐV/đơn vị"}'::jsonb),
('DC_THCS_NAM_1415_DOINAM', '{"sourceRow":94,"level":"THCS","code":"DC_THCS_NAM_1415_DOINAM","sportCode":"DC","sportName":"Đá cầu","gender":"Nam","group":"13 - 14 tuổi","name":"Đôi nam","form":"DOI","teamSize":"2","quota":"1 đôi/đơn vị"}'::jsonb),
('DC_THCS_NU_1415_DOINU', '{"sourceRow":95,"level":"THCS","code":"DC_THCS_NU_1415_DOINU","sportCode":"DC","sportName":"Đá cầu","gender":"Nữ","group":"13 - 14 tuổi","name":"Đôi nữ","form":"DOI","teamSize":"2","quota":"1 đôi/đơn vị"}'::jsonb),
('DC_THCS_HON_HOP_1415_DOINAMNU', '{"sourceRow":96,"level":"THCS","code":"DC_THCS_HON_HOP_1415_DOINAMNU","sportCode":"DC","sportName":"Đá cầu","gender":"Nam - nữ","group":"13 - 14 tuổi","name":"Đôi nam - nữ","form":"DOI","teamSize":"2","quota":"1 đôi/đơn vị"}'::jsonb),
('CV_THCS_NAM_1213_CANHAN', '{"sourceRow":97,"level":"THCS","code":"CV_THCS_NAM_1213_CANHAN","sportCode":"CV","sportName":"Cờ vua","gender":"Nam","group":"11 - 12 tuổi","name":"Cờ vua cá nhân","form":"CA_NHAN","teamSize":"4","quota":"Tối đa 4 VĐV nam, 4 VĐV nữ (phạm vi tính chưa rõ)"}'::jsonb),
('CV_THCS_NU_1213_CANHAN', '{"sourceRow":98,"level":"THCS","code":"CV_THCS_NU_1213_CANHAN","sportCode":"CV","sportName":"Cờ vua","gender":"Nữ","group":"11 - 12 tuổi","name":"Cờ vua cá nhân","form":"CA_NHAN","teamSize":"4","quota":"Tối đa 4 VĐV nam, 4 VĐV nữ (phạm vi tính chưa rõ)"}'::jsonb),
('CV_THCS_NAM_1415_CANHAN', '{"sourceRow":99,"level":"THCS","code":"CV_THCS_NAM_1415_CANHAN","sportCode":"CV","sportName":"Cờ vua","gender":"Nam","group":"13 - 14 tuổi","name":"Cờ vua cá nhân","form":"CA_NHAN","teamSize":"4","quota":"Tối đa 4 VĐV nam, 4 VĐV nữ (phạm vi tính chưa rõ)"}'::jsonb),
('CV_THCS_NU_1415_CANHAN', '{"sourceRow":100,"level":"THCS","code":"CV_THCS_NU_1415_CANHAN","sportCode":"CV","sportName":"Cờ vua","gender":"Nữ","group":"13 - 14 tuổi","name":"Cờ vua cá nhân","form":"CA_NHAN","teamSize":"4","quota":"Tối đa 4 VĐV nam, 4 VĐV nữ (phạm vi tính chưa rõ)"}'::jsonb),
('BD_THCS', '{"sourceRow":101,"level":"THCS","code":"BD_THCS","sportCode":"BD","sportName":"Bóng đá","gender":"Nam","group":"Cả cấp","name":"Bóng đá","form":"DONG_DOI","teamSize":"12","quota":"1 đội/đơn vị"}'::jsonb),
('KC_THCS_NAM_TC_DOINAM', '{"sourceRow":102,"level":"THCS","code":"KC_THCS_NAM_TC_DOINAM","sportCode":"KC","sportName":"Kéo co","gender":"Nam","group":"Cả cấp","name":"Kéo co nam","form":"DONG_DOI","teamSize":"10","quota":"1 đội/đơn vị"}'::jsonb),
('KC_THCS_NU_TC_DOINU', '{"sourceRow":103,"level":"THCS","code":"KC_THCS_NU_TC_DOINU","sportCode":"KC","sportName":"Kéo co","gender":"Nữ","group":"Cả cấp","name":"Kéo co nữ","form":"DONG_DOI","teamSize":"10","quota":"1 đội/đơn vị"}'::jsonb),
('KC_THCS_HON_HOP_TC_DOINAMNU', '{"sourceRow":104,"level":"THCS","code":"KC_THCS_HON_HOP_TC_DOINAMNU","sportCode":"KC","sportName":"Kéo co","gender":"Nam - nữ","group":"Cả cấp","name":"Kéo co nam - nữ","form":"DONG_DOI","teamSize":"10","quota":"1 đội/đơn vị"}'::jsonb),
('DG_THCS_NAM_TC_DEN41', '{"sourceRow":105,"level":"THCS","code":"DG_THCS_NAM_TC_DEN41","sportCode":"DG","sportName":"Đẩy gậy","gender":"Nam","group":"Cả cấp","name":"Đến 41kg","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/hạng cân/đơn vị"}'::jsonb),
('DG_THCS_NAM_TC_DEN44', '{"sourceRow":106,"level":"THCS","code":"DG_THCS_NAM_TC_DEN44","sportCode":"DG","sportName":"Đẩy gậy","gender":"Nam","group":"Cả cấp","name":"Đến 44kg","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/hạng cân/đơn vị"}'::jsonb),
('DG_THCS_NAM_TC_DEN47', '{"sourceRow":107,"level":"THCS","code":"DG_THCS_NAM_TC_DEN47","sportCode":"DG","sportName":"Đẩy gậy","gender":"Nam","group":"Cả cấp","name":"Đến 47kg","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/hạng cân/đơn vị"}'::jsonb),
('DG_THCS_NAM_TC_DEN50', '{"sourceRow":108,"level":"THCS","code":"DG_THCS_NAM_TC_DEN50","sportCode":"DG","sportName":"Đẩy gậy","gender":"Nam","group":"Cả cấp","name":"Đến 50kg","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/hạng cân/đơn vị"}'::jsonb),
('DG_THCS_NAM_TC_DEN53', '{"sourceRow":109,"level":"THCS","code":"DG_THCS_NAM_TC_DEN53","sportCode":"DG","sportName":"Đẩy gậy","gender":"Nam","group":"Cả cấp","name":"Đến 53kg","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/hạng cân/đơn vị"}'::jsonb),
('DG_THCS_NAM_TC_DEN56', '{"sourceRow":110,"level":"THCS","code":"DG_THCS_NAM_TC_DEN56","sportCode":"DG","sportName":"Đẩy gậy","gender":"Nam","group":"Cả cấp","name":"Đến 56kg","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/hạng cân/đơn vị"}'::jsonb),
('DG_THCS_NAM_TC_TREN56', '{"sourceRow":111,"level":"THCS","code":"DG_THCS_NAM_TC_TREN56","sportCode":"DG","sportName":"Đẩy gậy","gender":"Nam","group":"Cả cấp","name":"Trên 56kg","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/hạng cân/đơn vị"}'::jsonb),
('DG_THCS_NU_TC_DEN35', '{"sourceRow":112,"level":"THCS","code":"DG_THCS_NU_TC_DEN35","sportCode":"DG","sportName":"Đẩy gậy","gender":"Nữ","group":"Cả cấp","name":"Đến 35kg","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/hạng cân/đơn vị"}'::jsonb),
('DG_THCS_NU_TC_DEN38', '{"sourceRow":113,"level":"THCS","code":"DG_THCS_NU_TC_DEN38","sportCode":"DG","sportName":"Đẩy gậy","gender":"Nữ","group":"Cả cấp","name":"Đến 38kg","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/hạng cân/đơn vị"}'::jsonb),
('DG_THCS_NU_TC_DEN41', '{"sourceRow":114,"level":"THCS","code":"DG_THCS_NU_TC_DEN41","sportCode":"DG","sportName":"Đẩy gậy","gender":"Nữ","group":"Cả cấp","name":"Đến 41kg","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/hạng cân/đơn vị"}'::jsonb),
('DG_THCS_NU_TC_DEN44', '{"sourceRow":115,"level":"THCS","code":"DG_THCS_NU_TC_DEN44","sportCode":"DG","sportName":"Đẩy gậy","gender":"Nữ","group":"Cả cấp","name":"Đến 44kg","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/hạng cân/đơn vị"}'::jsonb),
('DG_THCS_NU_TC_DEN47', '{"sourceRow":116,"level":"THCS","code":"DG_THCS_NU_TC_DEN47","sportCode":"DG","sportName":"Đẩy gậy","gender":"Nữ","group":"Cả cấp","name":"Đến 47kg","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/hạng cân/đơn vị"}'::jsonb),
('DG_THCS_NU_TC_DEN50', '{"sourceRow":117,"level":"THCS","code":"DG_THCS_NU_TC_DEN50","sportCode":"DG","sportName":"Đẩy gậy","gender":"Nữ","group":"Cả cấp","name":"Đến 50kg","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/hạng cân/đơn vị"}'::jsonb),
('DG_THCS_NU_TC_TREN50', '{"sourceRow":118,"level":"THCS","code":"DG_THCS_NU_TC_TREN50","sportCode":"DG","sportName":"Đẩy gậy","gender":"Nữ","group":"Cả cấp","name":"Trên 50kg","form":"CA_NHAN","teamSize":"3","quota":"Tối đa 3 VĐV/hạng cân/đơn vị"}'::jsonb),
('VNM_THCS_NAM_TC_TUTRUQUYEN', '{"sourceRow":119,"level":"THCS","code":"VNM_THCS_NAM_TC_TUTRUQUYEN","sportCode":"VNM","sportName":"Vovinam","gender":"Nam","group":"Cả cấp","name":"Đơn luyện nam: Tứ trụ quyền","form":"CA_NHAN","teamSize":"2","quota":"2 VĐV hoặc 1 đội/nội dung/đơn vị"}'::jsonb),
('VNM_THCS_NAM_TC_LUONGNGHI', '{"sourceRow":120,"level":"THCS","code":"VNM_THCS_NAM_TC_LUONGNGHI","sportCode":"VNM","sportName":"Vovinam","gender":"Nam","group":"Cả cấp","name":"Đơn luyện nam: Tinh hoa lưỡng nghi kiếm pháp","form":"CA_NHAN","teamSize":"2","quota":"2 VĐV hoặc 1 đội/nội dung/đơn vị"}'::jsonb),
('VNM_THCS_NU_TC_LONGHOQUYEN', '{"sourceRow":121,"level":"THCS","code":"VNM_THCS_NU_TC_LONGHOQUYEN","sportCode":"VNM","sportName":"Vovinam","gender":"Nữ","group":"Cả cấp","name":"Đơn luyện nữ: Long hổ quyền","form":"CA_NHAN","teamSize":"2","quota":"2 VĐV hoặc 1 đội/nội dung/đơn vị"}'::jsonb),
('VNM_THCS_NU_TC_LUONGNGHI', '{"sourceRow":122,"level":"THCS","code":"VNM_THCS_NU_TC_LUONGNGHI","sportCode":"VNM","sportName":"Vovinam","gender":"Nữ","group":"Cả cấp","name":"Đơn luyện nữ: Tinh hoa lưỡng nghi kiếm pháp","form":"CA_NHAN","teamSize":"2","quota":"2 VĐV hoặc 1 đội/nội dung/đơn vị"}'::jsonb),
('VNM_THCS_NAM_TC_SONGLUYEN1', '{"sourceRow":123,"level":"THCS","code":"VNM_THCS_NAM_TC_SONGLUYEN1","sportCode":"VNM","sportName":"Vovinam","gender":"Nam","group":"Cả cấp","name":"Song luyện nam: Song luyện 1","form":"DOI","teamSize":"2","quota":"2 VĐV hoặc 1 đội/nội dung/đơn vị"}'::jsonb),
('VNM_THCS_NU_TC_SONGLUYEN1', '{"sourceRow":124,"level":"THCS","code":"VNM_THCS_NU_TC_SONGLUYEN1","sportCode":"VNM","sportName":"Vovinam","gender":"Nữ","group":"Cả cấp","name":"Song luyện nữ: Song luyện 1","form":"DOI","teamSize":"2","quota":"2 VĐV hoặc 1 đội/nội dung/đơn vị"}'::jsonb),
('VNM_THCS_NAM_TC_DK3942', '{"sourceRow":125,"level":"THCS","code":"VNM_THCS_NAM_TC_DK3942","sportCode":"VNM","sportName":"Vovinam","gender":"Nam","group":"Cả cấp","name":"Trên 39kg đến 42kg","form":"DOI_KHANG","teamSize":"2","quota":"2 VĐV/hạng cân/đơn vị"}'::jsonb),
('VNM_THCS_NAM_TC_DK4245', '{"sourceRow":126,"level":"THCS","code":"VNM_THCS_NAM_TC_DK4245","sportCode":"VNM","sportName":"Vovinam","gender":"Nam","group":"Cả cấp","name":"Trên 42kg đến 45kg","form":"DOI_KHANG","teamSize":"2","quota":"2 VĐV/hạng cân/đơn vị"}'::jsonb),
('VNM_THCS_NAM_TC_DK4548', '{"sourceRow":127,"level":"THCS","code":"VNM_THCS_NAM_TC_DK4548","sportCode":"VNM","sportName":"Vovinam","gender":"Nam","group":"Cả cấp","name":"Trên 45kg đến 48kg","form":"DOI_KHANG","teamSize":"2","quota":"2 VĐV/hạng cân/đơn vị"}'::jsonb),
('VNM_THCS_NAM_TC_DK4851', '{"sourceRow":128,"level":"THCS","code":"VNM_THCS_NAM_TC_DK4851","sportCode":"VNM","sportName":"Vovinam","gender":"Nam","group":"Cả cấp","name":"Trên 48kg đến 51kg","form":"DOI_KHANG","teamSize":"2","quota":"2 VĐV/hạng cân/đơn vị"}'::jsonb),
('VNM_THCS_NAM_TC_DK5154', '{"sourceRow":129,"level":"THCS","code":"VNM_THCS_NAM_TC_DK5154","sportCode":"VNM","sportName":"Vovinam","gender":"Nam","group":"Cả cấp","name":"Trên 51kg đến 54kg","form":"DOI_KHANG","teamSize":"2","quota":"2 VĐV/hạng cân/đơn vị"}'::jsonb),
('VNM_THCS_NU_TC_DK3942', '{"sourceRow":130,"level":"THCS","code":"VNM_THCS_NU_TC_DK3942","sportCode":"VNM","sportName":"Vovinam","gender":"Nữ","group":"Cả cấp","name":"Trên 39kg đến 42kg","form":"DOI_KHANG","teamSize":"2","quota":"2 VĐV/hạng cân/đơn vị"}'::jsonb),
('VNM_THCS_NU_TC_DK4245', '{"sourceRow":131,"level":"THCS","code":"VNM_THCS_NU_TC_DK4245","sportCode":"VNM","sportName":"Vovinam","gender":"Nữ","group":"Cả cấp","name":"Trên 42kg đến 45kg","form":"DOI_KHANG","teamSize":"2","quota":"2 VĐV/hạng cân/đơn vị"}'::jsonb),
('VNM_THCS_NU_TC_DK4548', '{"sourceRow":132,"level":"THCS","code":"VNM_THCS_NU_TC_DK4548","sportCode":"VNM","sportName":"Vovinam","gender":"Nữ","group":"Cả cấp","name":"Trên 45kg đến 48kg","form":"DOI_KHANG","teamSize":"2","quota":"2 VĐV/hạng cân/đơn vị"}'::jsonb),
('VNM_THCS_NU_TC_DK4851', '{"sourceRow":133,"level":"THCS","code":"VNM_THCS_NU_TC_DK4851","sportCode":"VNM","sportName":"Vovinam","gender":"Nữ","group":"Cả cấp","name":"Trên 48kg đến 51kg","form":"DOI_KHANG","teamSize":"2","quota":"2 VĐV/hạng cân/đơn vị"}'::jsonb),
('VNM_THCS_NU_TC_DK5154', '{"sourceRow":134,"level":"THCS","code":"VNM_THCS_NU_TC_DK5154","sportCode":"VNM","sportName":"Vovinam","gender":"Nữ","group":"Cả cấp","name":"Trên 51kg đến 54kg","form":"DOI_KHANG","teamSize":"2","quota":"2 VĐV/hạng cân/đơn vị"}'::jsonb)
on conflict(code) do update set detail=excluded.detail;
-- END GENERATED CATALOG
create sequence if not exists public.hkpd_athlete_number;
create table if not exists public.hkpd_school_rosters (
 school_id uuid primary key references public.hkpd_schools(id) on delete restrict,
 revision integer not null default 0, status text not null default 'draft' check(status in ('draft','submitted','approved','returned')),
 note text not null default '', updated_at timestamptz not null default now()
);
create table if not exists public.hkpd_live_athletes (
 id text primary key check(id ~ '^draft_[0-9a-fA-F-]{36}$'),
 code text not null unique default ('VDV' || nextval('public.hkpd_athlete_number')::text),
 school_id uuid not null references public.hkpd_school_rosters(school_id) on delete restrict,
 profile jsonb not null, active boolean not null default true
);
create unique index if not exists hkpd_athlete_identity on public.hkpd_live_athletes ((profile->>'identityNumber'))
where active and coalesce(profile->>'identityNumber','') <> '';
create table if not exists public.hkpd_event_operations (
 code text not null references public.hkpd_catalog_details(code),
 kind text not null check(kind in ('schedule','lanes','result')),
 revision integer not null default 0, payload jsonb not null,
 status text not null check(status in ('saved','submitted','confirmed')),
 actor_id uuid not null, confirmed_by uuid, updated_at timestamptz not null default now(),
 primary key(code,kind)
);
create table if not exists public.hkpd_live_audit (
 id uuid primary key default gen_random_uuid(),actor_id uuid not null,action text not null,
 resource text not null,revision integer not null,created_at timestamptz not null default now()
);
alter table public.hkpd_catalog_details enable row level security;
alter table public.hkpd_school_rosters enable row level security;
alter table public.hkpd_live_athletes enable row level security;
alter table public.hkpd_event_operations enable row level security;
alter table public.hkpd_live_audit enable row level security;
revoke all on public.hkpd_catalog_details,public.hkpd_school_rosters,public.hkpd_live_athletes,public.hkpd_event_operations,public.hkpd_live_audit from public,anon,authenticated;
revoke all on sequence public.hkpd_athlete_number from public,anon,authenticated;

create or replace function public.hkpd_online_state() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare access jsonb; role_name text; sports text[]; own_school uuid;
begin
 access:=public.hkpd_workspace_access();
 if access is null then raise exception 'Not authorized' using errcode='42501'; end if;
 role_name:=access->>'role'; own_school:=(access->'school'->>'id')::uuid;
 select coalesce(array_agg(x),'{}') into sports from jsonb_array_elements_text(access->'sportCodes') x;
 return jsonb_build_object('editionId','edition-2026','catalogCodes',access->'catalogCodes',
 'schools',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'code',s.code,'name',s.name,'level',s.level,
 'revision',coalesce(r.revision,0),'status',coalesce(r.status,'draft'),'note',coalesce(r.note,''),
 'athletes',coalesce((select jsonb_agg(
 case when role_name in ('leader','referee') then
 jsonb_build_object('draftId',a.id,'athleteCode',a.code,'fullName',a.profile->>'fullName','className',a.profile->>'className',
 'birthDate',a.profile->>'birthDate','gender',a.profile->>'gender','educationLevel',a.profile->>'educationLevel',
 'requestedEvent','', 'catalogSelections',(select jsonb_agg(c) from jsonb_array_elements_text(a.profile->'catalogSelections') c where split_part(c,'_',1)=any(sports) and access->'catalogCodes' ? c))
 else a.profile || jsonb_build_object('draftId',a.id,'athleteCode',a.code) end order by a.code)
 from public.hkpd_live_athletes a where a.school_id=s.id and a.active
 and (role_name in ('admin','school') or (r.status='approved' and exists(select 1 from jsonb_array_elements_text(a.profile->'catalogSelections') c where split_part(c,'_',1)=any(sports) and access->'catalogCodes' ? c)))),'[]'::jsonb)
 ) order by s.code) from public.hkpd_schools s left join public.hkpd_school_rosters r on r.school_id=s.id
 where s.edition_id='edition-2026' and (role_name='admin' or (role_name='school' and s.id=own_school)
 or (role_name in ('leader','referee') and r.status='approved' and exists(select 1 from public.hkpd_live_athletes a where a.school_id=s.id and a.active and exists(select 1 from jsonb_array_elements_text(a.profile->'catalogSelections') c where split_part(c,'_',1)=any(sports) and access->'catalogCodes' ? c))))),'[]'::jsonb),
 'operations',coalesce((select jsonb_agg(to_jsonb(o) - 'actor_id' - 'confirmed_by' order by o.code,o.kind) from public.hkpd_event_operations o
 where o.code in (select jsonb_array_elements_text(access->'catalogCodes')) and (role_name='admin'
 or (role_name in ('leader','referee') and split_part(o.code,'_',1)=any(sports))
 or (role_name='school' and (o.kind='schedule' or o.status='confirmed') and exists(select 1 from public.hkpd_live_athletes a where a.school_id=own_school and a.active and a.profile->'catalogSelections' ? o.code)))),'[]'::jsonb));
end;
$$;
create or replace function public.hkpd_save_roster(p_school_id uuid,p_revision integer,p_athletes jsonb,p_action text,p_note text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare access jsonb; roster public.hkpd_school_rosters; a jsonb; codes text[]; c text; d jsonb; student_level text; student_gender text; born date; age integer; grade integer; bounds text[]; next_status text;
begin
 -- Same lock as account/catalog writes: revocation and configuration changes cannot race a write.
 perform 1 from public.hkpd_admin_configuration where edition_id='edition-2026' for update;
 access:=public.hkpd_workspace_access();
 if access is null or not ((access->>'role'='school' and access->'school'->>'id'=p_school_id::text) or access->>'role'='admin') then raise exception 'Not authorized' using errcode='42501'; end if;
 if not exists(select 1 from public.hkpd_schools where id=p_school_id and edition_id='edition-2026') then raise exception 'Unknown school' using errcode='22023'; end if;
 insert into public.hkpd_school_rosters(school_id) values(p_school_id) on conflict do nothing;
 select * into roster from public.hkpd_school_rosters where school_id=p_school_id for update;
 if p_revision is null or roster.revision<>p_revision then raise exception 'Reload before saving' using errcode='40001'; end if;
 if p_action in ('approve','return') then
  if access->>'role'<>'admin' then raise exception 'Admin only' using errcode='42501'; end if;
  if (p_action='approve' and roster.status<>'submitted') or (p_action='return' and roster.status not in ('submitted','approved')) then raise exception 'Invalid transition' using errcode='22023'; end if;
  if p_action='return' and coalesce(length(btrim(p_note)),0)=0 then raise exception 'Return reason required' using errcode='22023'; end if;
  if exists(select 1 from public.hkpd_event_operations o where o.kind in ('lanes','result') and exists(select 1 from public.hkpd_live_athletes x where x.school_id=p_school_id and x.active and x.profile->'catalogSelections' ? o.code)) then raise exception 'Competition data exists; cannot reopen roster' using errcode='22023'; end if;
  if p_action='approve' and exists(select 1 from public.hkpd_live_athletes x, jsonb_array_elements_text(x.profile->'catalogSelections') selected(code) where x.school_id=p_school_id and x.active and not (access->'catalogCodes' ? selected.code)) then raise exception 'Content closed after submission' using errcode='22023'; end if;
  if p_action='approve' and exists(select 1 from public.hkpd_live_athletes x join public.hkpd_event_operations a on a.kind='schedule' and x.profile->'catalogSelections' ? a.code join public.hkpd_event_operations b on b.kind='schedule' and b.code>a.code and x.profile->'catalogSelections' ? b.code where x.school_id=p_school_id and x.active and (a.payload->>'start')::timestamptz<(b.payload->>'end')::timestamptz and (b.payload->>'start')::timestamptz<(a.payload->>'end')::timestamptz) then raise exception 'Athlete schedule conflict before approval' using errcode='22023'; end if;
  next_status:=case when p_action='approve' then 'approved' else 'returned' end;
 elsif p_action in ('save','submit') then
  if access->>'role'<>'school' then raise exception 'School only' using errcode='42501'; end if;
  if roster.status not in ('draft','returned') then raise exception 'Roster is locked' using errcode='22023'; end if;
  if jsonb_typeof(p_athletes) is distinct from 'array' or jsonb_array_length(p_athletes)>3000 or octet_length(p_athletes::text)>3000000 then raise exception 'Invalid roster' using errcode='22023'; end if;
  if p_action='submit' and jsonb_array_length(p_athletes)=0 then raise exception 'Empty roster' using errcode='22023'; end if;
  if (select count(*)<>count(distinct x->>'draftId') from jsonb_array_elements(p_athletes) x) then raise exception 'Duplicate athlete' using errcode='22023'; end if;
  for a in select * from jsonb_array_elements(p_athletes) loop
   if jsonb_typeof(a) is distinct from 'object' or coalesce(a->>'draftId','') !~ '^draft_[0-9a-fA-F-]{36}$' or coalesce(length(btrim(a->>'fullName')),0) not between 2 and 150
    or length(coalesce(a->>'className',''))>40 or length(coalesce(a->>'note',''))>1000
    or (coalesce(a->>'identityNumber','')<>'' and a->>'identityNumber' !~ '^[0-9]{12}$') then raise exception 'Invalid athlete profile' using errcode='22023'; end if;
   if exists(select 1 from public.hkpd_live_athletes x where x.id=a->>'draftId' and x.school_id<>p_school_id) then raise exception 'Athlete belongs to another school' using errcode='42501'; end if;
   if jsonb_typeof(a->'catalogSelections') is distinct from 'array' then raise exception 'Content selections required' using errcode='22023'; end if;
   select coalesce(array_agg(x),'{}') into codes from jsonb_array_elements_text(a->'catalogSelections') x;
   if cardinality(codes)<>(select count(distinct x) from unnest(codes) x) or (select count(distinct split_part(x,'_',1)) from unnest(codes) x)>2 then raise exception 'Invalid or too many selections' using errcode='22023'; end if;
   if p_action='submit' and (cardinality(codes)=0 or coalesce(a->>'identityNumber','')='' or coalesce(a->>'className','')='') then raise exception 'Complete profile before submission' using errcode='22023'; end if;
   if cardinality(codes)>0 then
    if coalesce(a->>'birthDate','') !~ '^\d{4}-\d{2}-\d{2}$' or a->>'gender' is null or a->>'gender' not in ('male','female') then raise exception 'Date and gender required' using errcode='22023'; end if;
    born:=(a->>'birthDate')::date; age:=2026-extract(year from born)::integer;
    grade:=substring(a->>'className' from '^([0-9]{1,2})')::integer;
    student_level:=case when grade between 1 and 5 then 'TH' when grade between 6 and 9 then 'THCS' else a->>'educationLevel' end;
    if grade>=10 or student_level is null or student_level not in ('TH','THCS') or age<0 or (student_level='TH' and age>=11) or (student_level='THCS' and age<11) then raise exception 'Ineligible school level or age' using errcode='22023'; end if;
    if not exists(select 1 from public.hkpd_schools where id=p_school_id and (level='TH_THCS' or level=student_level)) then raise exception 'School level mismatch' using errcode='22023'; end if;
    student_gender:=case when a->>'gender'='male' then 'Nam' else 'Nữ' end;
    foreach c in array codes loop
     select detail into d from public.hkpd_catalog_details where code=c;
     if d is null or not (access->'catalogCodes' ? c) or d->>'level'<>student_level or d->>'gender' not in (student_gender,'Nam - nữ') then raise exception 'Ineligible or closed content' using errcode='22023'; end if;
     bounds:=regexp_match(d->>'group','^(\d+)\s*-\s*(\d+)\s+tuổi$');
     if bounds is not null and age not between bounds[1]::integer and bounds[2]::integer then raise exception 'Age group mismatch' using errcode='22023'; end if;
    end loop;
   end if;
  end loop;
  update public.hkpd_live_athletes set active=false where school_id=p_school_id;
  for a in select * from jsonb_array_elements(p_athletes) loop
   -- Whitelist stored profile. Inline photos and arbitrary role/status keys never persist.
   a:=jsonb_build_object('draftId',a->>'draftId','fullName',btrim(a->>'fullName'),'className',coalesce(a->>'className',''),
    'identityNumber',coalesce(a->>'identityNumber',''),'birthDate',coalesce(a->>'birthDate',''),'gender',coalesce(a->>'gender','male'),
    'note',coalesce(a->>'note',''),'educationLevel',coalesce(a->>'educationLevel',''),'catalogSelections',a->'catalogSelections','requestedEvent','');
   insert into public.hkpd_live_athletes(id,school_id,profile) values(a->>'draftId',p_school_id,a)
   on conflict(id) do update set profile=excluded.profile,active=true;
  end loop;
  next_status:=case when p_action='submit' then 'submitted' else 'draft' end;
 else raise exception 'Unknown action' using errcode='22023'; end if;
 update public.hkpd_school_rosters set revision=revision+1,status=next_status,note=left(coalesce(p_note,''),1000),updated_at=now() where school_id=p_school_id;
 insert into public.hkpd_live_audit(actor_id,action,resource,revision) values(auth.uid(),'roster.'||p_action,p_school_id::text,roster.revision+1);
 return public.hkpd_online_state();
end;
$$;
create or replace function public.hkpd_save_operation(p_code text,p_kind text,p_revision integer,p_payload jsonb,p_action text default 'save') returns jsonb
language plpgsql security definer set search_path='' as $$
declare access jsonb; previous public.hkpd_event_operations; detail jsonb; item jsonb; athlete_ids text[]; start_time timestamptz; end_time timestamptz; next_status text;
begin
 perform 1 from public.hkpd_admin_configuration where edition_id='edition-2026' for update;
 access:=public.hkpd_workspace_access();
 if access is null then raise exception 'Not authorized' using errcode='42501'; end if;
 select d.detail into detail from public.hkpd_catalog_details d where code=p_code;
 if detail is null or not (access->'catalogCodes' ? p_code) or p_kind is null or p_kind not in ('schedule','lanes','result') or p_action is null or p_action not in ('save','confirm') then raise exception 'Invalid operation' using errcode='22023'; end if;
 if p_kind='schedule' or p_action='confirm' then
  if access->>'role'<>'admin' then raise exception 'Admin required' using errcode='42501'; end if;
 elsif access->>'role' not in ('leader','referee') or not (access->'sportCodes' ? (detail->>'sportCode')) then raise exception 'Assigned official required' using errcode='42501'; end if;
 select * into previous from public.hkpd_event_operations where code=p_code and kind=p_kind for update;
 if p_revision is null or coalesce(previous.revision,0)<>p_revision then raise exception 'Reload before saving' using errcode='40001'; end if;
 if p_action='confirm' then
  if p_kind<>'result' or previous.status is distinct from 'submitted' then raise exception 'No submitted result' using errcode='22023'; end if;
  p_payload:=previous.payload; next_status:='confirmed';
 else
  if previous.status='confirmed' then raise exception 'Confirmed results are immutable' using errcode='22023'; end if;
  next_status:=case when p_kind='result' then 'submitted' else 'saved' end;
 end if;
 if p_payload is null or octet_length(p_payload::text)>500000 then raise exception 'Invalid payload' using errcode='22023'; end if;
 if p_kind='schedule' then
  if jsonb_typeof(p_payload) is distinct from 'object' or coalesce(length(btrim(p_payload->>'venue')),0) not between 2 and 200 then raise exception 'Venue required' using errcode='22023'; end if;
  start_time:=(p_payload->>'start')::timestamptz; end_time:=(p_payload->>'end')::timestamptz;
  if start_time is null or end_time is null or end_time<=start_time or end_time-start_time>interval '1 day' then raise exception 'Invalid schedule times' using errcode='22023'; end if;
  if exists(select 1 from public.hkpd_event_operations o where o.kind='schedule' and o.code<>p_code
    and (o.payload->>'start')::timestamptz<end_time and (o.payload->>'end')::timestamptz>start_time
    and (lower(btrim(o.payload->>'venue'))=lower(btrim(p_payload->>'venue'))
      or exists(select 1 from public.hkpd_live_athletes a join public.hkpd_school_rosters r on r.school_id=a.school_id where a.active and r.status='approved' and a.profile->'catalogSelections' ? p_code and a.profile->'catalogSelections' ? o.code))) then raise exception 'Schedule conflict: venue or athlete' using errcode='22023'; end if;
  p_payload:=jsonb_build_object('venue',btrim(p_payload->>'venue'),'start',start_time,'end',end_time);
 else
  -- Team membership / match progression require their own workflow. Never fabricate teams from people.
  if detail->>'form'<>'CA_NHAN' then raise exception 'Individual entries only; confirmed team composition required' using errcode='22023'; end if;
  if p_kind='lanes' and not ((detail->>'sportCode'='BOI') or (detail->>'sportCode'='DK' and detail->>'name' like 'Chạy%')) then raise exception 'Not a lane event' using errcode='22023'; end if;
  if jsonb_typeof(p_payload) is distinct from 'array' or jsonb_array_length(p_payload)=0 or jsonb_array_length(p_payload)>3000 then raise exception 'Entrants required' using errcode='22023'; end if;
  select array_agg(x->>'athleteId') into athlete_ids from jsonb_array_elements(p_payload) x;
  if cardinality(athlete_ids)<>(select count(distinct x) from unnest(athlete_ids) x) then raise exception 'Duplicate athlete' using errcode='22023'; end if;
  if exists(select 1 from unnest(athlete_ids) v(entrant_id) where not exists(select 1 from public.hkpd_live_athletes a join public.hkpd_school_rosters r on r.school_id=a.school_id where a.id=v.entrant_id and a.active and r.status='approved' and a.profile->'catalogSelections' ? p_code)) then raise exception 'Unapproved or ineligible athlete' using errcode='22023'; end if;
  if p_kind='lanes' then
   for item in select * from jsonb_array_elements(p_payload) loop
    if jsonb_typeof(item->'heat') is distinct from 'number' or jsonb_typeof(item->'lane') is distinct from 'number' or (item->>'heat')::numeric<>trunc((item->>'heat')::numeric) or (item->>'lane')::numeric<>trunc((item->>'lane')::numeric) or (item->>'heat')::integer not between 1 and 1000 or (item->>'lane')::integer not between 1 and 16 then raise exception 'Invalid lane' using errcode='22023'; end if;
   end loop;
   if (select count(*)<>count(distinct (x->>'heat',x->>'lane')) from jsonb_array_elements(p_payload) x) then raise exception 'Duplicate heat/lane' using errcode='22023'; end if;
   select jsonb_agg(jsonb_build_object('athleteId',x->>'athleteId','heat',(x->>'heat')::integer,'lane',(x->>'lane')::integer)) into p_payload from jsonb_array_elements(p_payload) x;
  else
   if exists(select 1 from jsonb_array_elements(p_payload) x where jsonb_typeof(x->'value') is distinct from 'string' or length(btrim(x->>'value')) not between 1 and 100) then raise exception 'Result value required' using errcode='22023'; end if;
   select jsonb_agg(jsonb_build_object('athleteId',x->>'athleteId','value',btrim(x->>'value'))) into p_payload from jsonb_array_elements(p_payload) x;
  end if;
 end if;
 insert into public.hkpd_event_operations(code,kind,revision,payload,status,actor_id,confirmed_by)
 values(p_code,p_kind,coalesce(previous.revision,0)+1,p_payload,next_status,case when p_action='confirm' then previous.actor_id else auth.uid() end,case when p_action='confirm' then auth.uid() else null end)
 on conflict(code,kind) do update set revision=excluded.revision,payload=excluded.payload,status=excluded.status,actor_id=excluded.actor_id,confirmed_by=excluded.confirmed_by,updated_at=now();
 insert into public.hkpd_live_audit(actor_id,action,resource,revision) values(auth.uid(),p_kind||'.'||p_action,p_code,coalesce(previous.revision,0)+1);
 return public.hkpd_online_state();
end;
$$;
-- Do not hide live schedules/results by removing their content from the edition.
create or replace function public.hkpd_guard_live_catalog() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.hkpd_event_operations o where not (o.code=any(new.catalog_codes))) then raise exception 'Content has competition data' using errcode='22023'; end if;
 return new;
end;
$$;
drop trigger if exists hkpd_guard_live_catalog on public.hkpd_admin_configuration;
create trigger hkpd_guard_live_catalog before update of catalog_codes on public.hkpd_admin_configuration for each row execute function public.hkpd_guard_live_catalog();
revoke all on function public.hkpd_guard_live_catalog() from public,anon,authenticated;
revoke all on function public.hkpd_online_state(),public.hkpd_save_roster(uuid,integer,jsonb,text,text),public.hkpd_save_operation(text,text,integer,jsonb,text) from public,anon;
grant execute on function public.hkpd_online_state(),public.hkpd_save_roster(uuid,integer,jsonb,text,text),public.hkpd_save_operation(text,text,integer,jsonb,text) to authenticated;
commit;
