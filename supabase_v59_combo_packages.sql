-- Heybaragise v59
-- ให้ Combo เลือก "แพ็กเกจ" ของสินค้าโดยตรง
-- รันไฟล์นี้ 1 ครั้งใน Supabase SQL Editor

alter table public.combo_items
  add column if not exists package_id uuid;

-- ผูกแพ็กเกจที่เลือกกับตาราง packages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'combo_items_package_id_fkey'
  ) THEN
    ALTER TABLE public.combo_items
      ADD CONSTRAINT combo_items_package_id_fkey
      FOREIGN KEY (package_id)
      REFERENCES public.packages(id)
      ON DELETE SET NULL;
  END IF;
END $$;

create index if not exists idx_combo_items_package_id
  on public.combo_items(package_id);

-- หลังจากอัปเดตโค้ด v59 แล้ว Combo ใหม่ต้องมี package_id
-- Combo เก่าที่สร้างก่อน v59 จะยังเปิดดูได้ แต่จะยังไม่มีแพ็กเกจที่เลือก
-- ให้แก้ไข Combo เก่าอีกครั้งเพื่อเลือก 2 แพ็กเกจ
