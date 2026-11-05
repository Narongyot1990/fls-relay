# ทดสอบ Inventory / Import กับฐานข้อมูลจริง

เปิด `http://localhost:3000/preview` เลือก IT หรือ Implementation แล้วเลือก **นำเข้า CSV / Excel**

## สิ่งที่เปลี่ยน

- หน้านี้อ่าน MongoDB จริง ไม่มีข้อมูลเครื่อง คนขับ หรือไซต์ตัวอย่าง และไม่ seed ข้อมูลเมื่อเปิดหน้า
- ดึง development environment ของ Vercel โปรเจกต์ `fls-relay` ผ่าน CLI ไว้ใน `.env.local` ซึ่ง Git ignore อยู่ ไม่แสดง secret ในโค้ดหรือเอกสาร
- ใช้ collection `devices`, `sites`, `holders` เดิม ไม่มีการย้ายหรือลบข้อมูลเดิม
- ดูภาพรวมทุกไซต์/รายไซต์/สต็อกที่ยังไม่จัดสรรไซต์ได้ ส่วน Site Leader อ้างอิง holder จริงและตรวจไซต์บน API ด้วย
- ตัวสลับบทบาทเป็นกลไกสำหรับทดสอบ development เท่านั้น API ใหม่ปฏิเสธ production จนกว่าจะมี authentication จริง ไม่ใช่ระบบ Login

## นำเข้าโดยผู้ใช้

1. เลือกไฟล์ `.csv` หรือ `.xlsx` ขนาดไม่เกิน 5 MB / 2,000 รายการ
2. กด **ตรวจข้อมูลก่อนนำเข้า (ไม่บันทึก)** เพื่ออ่านคอลัมน์ วันที่ และตรวจรายการซ้ำกับฐานข้อมูล
3. เลือก worksheet หรือคอลัมน์ Device ID ได้ หากเปลี่ยนให้กดตรวจใหม่
4. ตรวจตารางและจำนวนพร้อมนำเข้า รายการซ้ำในฐานข้อมูลจะข้ามและไม่แก้ทับ ส่วนรหัสซ้ำในไฟล์จะแจ้งทุกแถวที่ซ้ำให้ตรวจต้นฉบับก่อน
5. ติ๊กยืนยัน แล้วกด **ยืนยันนำเข้า … เครื่อง** เท่านั้นจึงเขียนลงฐานข้อมูล
6. อ่านผลเพิ่ม/ข้าม/ไม่สำเร็จ แล้วไป **รายการเครื่อง** เพื่อดูและทดสอบแก้ไขหรือลบรายการที่ยังไม่เคยใช้งาน

การเลือกไฟล์ การตรวจข้อมูล การเปลี่ยนบทบาท และการกดรีเฟรชไม่เพิ่มข้อมูล ไม่มีการนำเข้าไฟล์ของผู้ใช้โดยอัตโนมัติ ไม่มีการเก็บสำเนาไฟล์ต้นฉบับใน repo

## โครงสร้างไฟล์ที่ตรวจแล้ว

`TRN_Mobile_Inventory_12102026.xlsx` เป็น Intune export มี 37 แถว และคอลัมน์:

`Device name`, `Managed by`, `Ownership`, `Compliance`, `OS`, `OS version`, `Primary user UPN`, `Last check-in`

ไม่มี IMEI/Serial/รุ่น/เบอร์โทร ไม่แยก serial หรือเดารุ่นจากชื่อเครื่อง ระบบเสนอ `Device name` เป็น Device ID แต่ผู้ใช้ต้องตรวจความเหมาะสม เพราะชื่อ Intune อาจเปลี่ยนได้ หากมีคอลัมน์ Device ID ของบริษัทให้เลือกคอลัมน์นั้น

ไฟล์นี้มี Device name เดียวกันที่แถว 20 และ 26 เมื่อใช้ชื่อเป็นรหัส ระบบจึงแจ้ง 2 แถวนี้ให้ตรวจ เหลือ 35 แถวที่ผ่าน ไม่เปิดเผยค่ารหัสจริงในเอกสารนี้

เครื่องใหม่มี `status=registered`, `currentSiteId=null`, `currentHolderId=null` และไม่มี IMEI/Serial สมมติ ข้อมูลจาก Intune เป็นข้อมูลอ้างอิง ไม่กำหนดคนขับจาก Primary user UPN และไม่ถือว่าผ่านการตรวจสภาพพร้อมจ่ายทันที

## การแก้ไขและลบ

- PATCH ใช้ MongoDB `_id` ที่คงที่ ไม่ใช้ IMEI เป็น route key จึงแก้ข้อมูล IMEI ภายหลังได้
- แก้ Device ID, Device name, รุ่น, IMEI, Serial, เบอร์โทรได้ตามสิทธิ์ IT/Implementation ไม่แก้ไซต์/ผู้ถือ/สถานะผ่านฟอร์มข้อมูลเครื่อง
- Device ID เปลี่ยนไม่ได้เมื่อเริ่มมีกิจกรรมการดูแลเครื่อง และการตั้งรหัส/IMEI/Serial ซ้ำถูกปฏิเสธ
- ลบได้เฉพาะ registered ที่ไม่มีไซต์ ไม่มีผู้ถือ และไม่มี `lastActivity` เท่านั้น มีหน้าถามยืนยันก่อนส่ง DELETE
- คืนหน้า Home แบบการ์ดสีตาม template ที่ review แล้ว โดยใช้ข้อมูลจริง พร้อมเมนูเดิมตามบทบาท Inventory/Import ยังคงเชื่อม MongoDB
- คืน flow ทบทวน UI ส่งมอบ: เลือกคนขับจริง → เลือกเครื่องจริงในขอบเขต → เปิดเงื่อนไข → ทดลองเซ็น หากไม่มีข้อมูลที่เข้าเงื่อนไข เปิดฟอร์มเปล่าที่แสดงขีดว่างได้ ไม่สร้างคนขับ/เครื่องสมมติ
- ข้อความเงื่อนไข EN/TH มาจาก `Professional_Smartphone_Handover_Bilingual_EN_TH.docx` โดยตรง ครบ 8 หมวดและอุปกรณ์เสริม 5 รายการ พร้อมข้อความยอมรับตามเอกสาร ลายเซ็นอยู่ในหน่วยความจำหน้าจอเท่านั้น Submit ถูกปิดไว้ ไม่มีการเขียนข้อมูลหรือจำลองว่าส่งมอบสำเร็จ Return/Exchange และเมนูอื่นที่ยังไม่เชื่อมการทำรายการแสดงโครงหน้าสำหรับ review
- ตัวสลับ EN/TH ที่หัวเว็บใช้ร่วมกันทั้ง Home/Inventory/Import/หน้าเงื่อนไข ค่าเริ่มต้นเมื่อเปิดใหม่คือ EN การเปลี่ยนภาษา หรือเปลี่ยนรายการอุปกรณ์เสริม จะล้างลายเซ็นและการยอมรับเดิม ไม่เปลี่ยนข้อมูลเครื่องหรือรายชื่อจากฐานข้อมูล

## ตรวจภาษาและข้อความเงื่อนไข

- `node scripts/verify-ui-language.mjs`: ตรวจ dictionary ของหน้าใหม่และยืนยัน HTTP หน้า preview เปิดมาที่ EN
- `python scripts/verify-handover-policy.py <path-to-source.docx>`: ตรวจ hash ต้นฉบับและข้อความ EN/TH ของเงื่อนไขทั้ง 52 ย่อหน้า รวม 8 หมวดและอุปกรณ์เสริม 5 รายการ ว่าครบตามต้นฉบับใน `lib/policies/smartphone-handover.json`
- สร้างข้อมูลนโยบายจาก Word ด้วย `python scripts/extract-handover-policy.py <path-to-source.docx>` ไม่เขียนฐานข้อมูล ไม่เพิ่มชื่อคนหรือเครื่องตัวอย่าง และไม่เปลี่ยนเอกสารต้นฉบับ

## Index compatibility

การตรวจไฟล์และ GET ไม่สร้างหรือแก้ indexes เมื่อผู้ใช้ยืนยันเขียนครั้งแรก ระบบเตรียม unique index สำหรับ Device ID ที่ normalize แล้ว และแทนที่ unique indexes เดิมของ IMEI/Serial ด้วย partial unique indexes เพื่อให้ละค่าว่างได้หลายเครื่อง แต่ค่าจริงที่ระบุยังต้องไม่ซ้ำ เปลี่ยนเฉพาะ index แบบ single-field unique เดิมของสองฟิลด์นี้ ไม่มีการลบข้อมูลเครื่อง

Legacy importer ที่สร้าง PENDING IMEI ถูกปิด (HTTP 410) และหน้า import เดิมนำมาหน้าใหม่ เพื่อไม่ให้มีสองวิธีที่ให้ผลต่างกัน

## หลักฐานการตรวจ

- `node scripts/test-inventory.mjs`: ทดสอบ parser, Excel dates/numeric versions, mapping, duplicate IDs, optional identifiers, index migration และ import confirmation ด้วย in-memory fakes ไม่เชื่อม DB เพื่อเขียน
- `node --env-file=.env.local scripts/verify-inventory-readonly.mjs <path-to-file>`: เรียก preview และ GET เท่านั้น ตรวจจำนวนและ fingerprint ของ devices + indexes ก่อน/หลังให้เหมือนกัน รวมการทดสอบ Site Leader ข้ามขอบเขตแล้วได้ 403
- ตอนตรวจไฟล์จริง: 37 แถว, ผ่าน 35, ต้องตรวจ 2, เครื่องก่อน/หลัง 15, ข้อมูลและ indexes ไม่เปลี่ยน
- ยังไม่ได้ทดสอบ commit/PATCH/DELETE กับฐานข้อมูลจริง ตามคำสั่งไม่ให้ import; ผู้ใช้เป็นผู้เริ่มเขียนเพื่อทดสอบเอง

Excel parsing uses the [ExcelJS workbook API](https://github.com/exceljs/exceljs#reading-xlsx) locally on the server. CSV supports BOM, quoted delimiters, escaped quotes and embedded newlines.
