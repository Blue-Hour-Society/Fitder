# Fitder Dashboard Branch

## ภาพรวมโปรเจกต์

Fitder คือแพลตฟอร์ม fitness marketplace ที่เชื่อมต่อผู้ใช้งาน 3 กลุ่มหลัก ได้แก่ ลูกค้า เทรนเนอร์ และยิม โดยมี AI pose analysis เป็นฟีเจอร์แตกต่างสำคัญ ลูกค้าสามารถตั้งเป้าหมาย ค้นหาเทรนเนอร์ จองเซสชัน ตรวจฟอร์มการออกกำลังกายด้วย AI และแชทกับเทรนเนอร์หลังมี booking ที่ active ได้

ฝั่งเทรนเนอร์ใช้ Fitder เพื่อเปิดช่วงเวลาว่าง รับคำขอจอง ดูแลลูกค้า ติดตามรายได้ แชทกับลูกค้า และปรับข้อมูลโปรไฟล์สาธารณะ ส่วนยิมเป็นทิศทางของ product ในภาพใหญ่ แต่ branch นี้ยังไม่ได้ implement dashboard สำหรับยิม

Product story หลัก:

- ลูกค้าใช้ Fitder เพื่อกำหนดเป้าหมาย หาเทรนเนอร์ จองเซสชัน และตรวจท่าด้วย AI
- เทรนเนอร์ใช้ Fitder เพื่อเปิด availability, รับ booking, ดูแลลูกค้า และสร้างรายได้
- ยิมเป็น stakeholder ใน marketplace ระยะถัดไป สำหรับสถานที่ อุปทาน และ operational workflows
- AI เป็นตัวช่วยตัดสินใจและสร้าง conversion ไม่ใช่สิ่งที่มาแทนเทรนเนอร์

## วัตถุประสงค์ของ Branch

Branch `dashboard` มีไว้เพื่อปรับปรุง dashboard เท่านั้น เป้าหมายคือเปลี่ยน dashboard จากหน้ารวมตัวเลขแบบ passive ให้เป็น command center ที่ช่วยผู้ใช้ตัดสินใจว่าควรทำอะไรต่อ

branch นี้ตั้งใจหลีกเลี่ยงการแก้ schema, auth, generated Supabase types, route generation และหน้าที่ไม่เกี่ยวข้อง งานหลักอยู่ที่ information architecture ของ dashboard, การ map ข้อมูลจริง, empty state ที่ซื่อสัตย์ และ product storytelling ที่ปลอดภัย

## งานที่ทำเสร็จแล้ว

### Client Dashboard

Client Dashboard ถูกปรับใหม่ใน `src/routes/client.dashboard.tsx` ให้เป็น fitness command center

สิ่งที่ปรับปรุง:

- **Next Best Action**: แนะนำ action ถัดไปตาม state จริง เช่น กรอกโปรไฟล์ ตรวจท่าด้วย AI จองเทรนเนอร์ หรือดู booking ถัดไป
- **Quick Actions**: เพิ่มทางลัดไป AI Pose Check, Trainer Discovery, Bookings และ Profile
- **AI Form Summary**: ใช้ข้อมูลจริงจาก `pose_sessions` เพื่อแสดงคะแนนล่าสุด ท่าล่าสุด ค่าเฉลี่ย คะแนนดีที่สุด และจำนวน session
- **AI Form Trend**: ใช้ Recharts แสดงคะแนน AI form ล่าสุดจากข้อมูลจริงเท่านั้น ถ้าข้อมูลไม่พอจะไม่สร้างกราฟปลอม
- **Upcoming Session**: ใช้ `bookings`, `availability_slots` และชื่อเทรนเนอร์ เพื่อแสดง booking ที่กำลังจะมาถึง
- **Training Activity**: แสดงจำนวน AI sessions, active bookings, completed bookings, goal และ session preference จากข้อมูลจริง
- **AI to Trainer CTA**: เชื่อมคะแนน AI ที่ต่ำกับการจองเทรนเนอร์ ถ้ายังไม่มีคะแนน AI จะชวนให้เริ่มตรวจท่าอย่างตรงไปตรงมา
- **Rewards**: แสดง `profiles.reward_points` เท่านั้น ไม่สร้าง logic ซ้ำกับ `DailyReward`
- **Trainer Recommendations**: ยังใช้ `fetchRankedTrainers()` และ `TrainerCard` เดิม แต่ลด priority ลงมาให้อยู่ท้าย dashboard
- **Empty States**: เพิ่ม empty state ที่บอกสถานะจริงและพาผู้ใช้ไปยัง action ที่เหมาะสม
- **Responsive Layout**: desktop ใช้ 60/40 layout ส่วน mobile เรียงลำดับให้ action สำคัญมาก่อน

เหตุผลของ feature เหล่านี้:

- dashboard ควรช่วยลูกค้ารู้ว่าควรทำอะไรต่อ ไม่ใช่แค่แสดงรายการเทรนเนอร์
- AI data ควรนำไปสู่ action โดยไม่สร้าง metric ปลอม
- trainer recommendation ยังสำคัญต่อ marketplace แต่ไม่ควรครอบงำ dashboard ทั้งหน้า
- empty state ควรช่วย activate ผู้ใช้ไปยัง flow จริง

### Trainer Dashboard

Trainer Dashboard ถูกปรับใหม่ใน `src/routes/trainer.dashboard.tsx` ให้เป็น trainer command center

สิ่งที่ปรับปรุง:

- **Hero + Next Best Action**: จัดลำดับสิ่งที่เทรนเนอร์ควรทำก่อน เช่น ตอบรับ booking, เตรียม session ถัดไป, เพิ่ม availability, เติมโปรไฟล์ หรือดูแลลูกค้า
- **Quick Actions**: เพิ่มทางลัดไป Manage Bookings, Manage Availability, View Clients และ Open Chat
- **Pending Booking Requests**: ใช้ booking จริงที่ status เป็น `pending` แสดงชื่อลูกค้า วันเวลา และสถานะ
- **Today’s / Upcoming Schedule**: ใช้ booking และ availability slot จริงเพื่อแสดง session ที่กำลังจะมาถึง
- **Revenue Snapshot**: ใช้ completed bookings เท่านั้นเพื่อแสดงจำนวน session ที่เสร็จ รายได้รวม รายได้สุทธิ และ commission
- **Availability Health**: ใช้ availability slots จริงเพื่อแสดงจำนวน slot ทั้งหมด slot ที่ถูกจอง และ slot ที่ยังว่าง
- **Active Clients**: ใช้ booking ที่เป็น `accepted` หรือ `completed` เพื่อแสดงจำนวนลูกค้า active และรายชื่อลูกค้าบางส่วน
- **Profile / Rating**: ใช้ `trainer_profiles` เพื่อแสดง rating, จำนวน review, ราคา/เซสชัน และข้อมูลโปรไฟล์ที่ยังควรเติม
- **Auto Accept Control**: คง behavior เดิม แต่ย้ายไปอยู่ในบริบทของ profile และ conversion
- **AI Opportunity Card**: ไม่อ่าน `pose_sessions` ของลูกค้า แต่แสดง roadmap card ที่อธิบาย future value โดยเคารพ privacy และ RLS

เหตุผลของ feature เหล่านี้:

- เทรนเนอร์ควรรู้ทันทีว่า “ควรทำอะไรต่อเพื่อช่วยลูกค้าและสร้างรายได้”
- action ที่สำคัญต่อธุรกิจคือรับ booking, เปิดเวลาว่าง, ดูแลลูกค้า และทำโปรไฟล์ให้พร้อมขาย
- AI ควรถูกเล่าเป็น future coaching insight layer จนกว่าจะมี consent และ access model ที่ถูกต้อง

## การตัดสินใจเชิง Product

### ไม่ใช้ metric ปลอม

ทุกตัวเลขใน dashboard ต้องมาจากข้อมูลจริง ถ้าข้อมูลไม่มี UI จะแสดง empty state ที่ซื่อสัตย์แทน การไม่สร้างข้อมูลปลอมช่วยรักษาความน่าเชื่อถือของ product และ demo สำหรับ investor

### ไม่ทำ nutrition, calories หรือ body metrics

โปรเจกต์ยังไม่มีข้อมูล nutrition, calories, BMI, body fat, heart rate หรือ wearable data ที่เชื่อถือได้ จึงไม่ควรเพิ่ม widget เหล่านี้ เพราะจะเสี่ยงต่อการสร้าง health claim ที่ไม่มีฐานข้อมูลรองรับ

### ไม่สร้าง streak ปลอม

แม้โปรเจกต์มี daily login/reward data แต่ dashboard ยังไม่เพิ่ม streak logic หากยัง derive ได้ไม่ปลอดภัยพอ Streak ไม่ควรถูกสร้างจากข้อมูลที่อ่อนหรือไม่ครบ

### ยังไม่ทำ AI client alerts ฝั่ง trainer

Trainer-side AI alerts ยังไม่ถูก implement เพราะ RLS ปัจจุบันของ `pose_sessions` อนุญาตให้ client จัดการข้อมูล pose ของตัวเองเท่านั้น เทรนเนอร์ไม่ควรเห็นคะแนน AI ของลูกค้าโดยไม่มี consent หรือ permission model ที่ชัดเจน

### ใช้เฉพาะข้อมูล Supabase จริงที่มีอยู่

dashboard widgets ใช้ table และ field ที่มีอยู่แล้วในระบบ การ query เน้น field ที่ชัดเจน และใช้วิธี conservative เช่น query profile แยกเมื่อ join อาจเปราะบาง

### เคารพ RLS และ privacy

Trainer Dashboard ใช้ AI roadmap card แทนการอ่าน `pose_sessions` ของลูกค้า วิธีนี้ยังเล่า product story ได้โดยไม่ละเมิดสมมติฐานเรื่องสิทธิ์เข้าถึงข้อมูล

## ปรัชญาการออกแบบ Dashboard

Dashboard ไม่ควรเป็นแค่ที่วางข้อมูล

Dashboard ควรช่วยให้ผู้ใช้ตัดสินใจได้ว่าควรทำอะไรต่อ

สำหรับ Fitder หมายความว่า:

- ลูกค้าควรเห็นสถานะการฝึก ความคืบหน้าจาก AI booking ถัดไป และ action ถัดไป
- เทรนเนอร์ควรเห็นงานที่ต้องทำ รายได้ ลูกค้าที่ต้องดูแล และวิธีเพิ่มโอกาสรับ booking
- ทุก widget ควรช่วย inform decision, สร้างความมั่นใจ หรือพาผู้ใช้ไปยัง workflow ที่มีความหมาย

## ไฟล์ที่แก้ไข

- `src/routes/client.dashboard.tsx`
  - ปรับ Client Dashboard เป็น fitness command center โดยใช้ข้อมูลจริงจาก profile, booking, pose session, reward และ trainer recommendation

- `src/routes/trainer.dashboard.tsx`
  - ปรับ Trainer Dashboard เป็น trainer command center โดยใช้ข้อมูลจริงจาก bookings, availability slots, trainer profile, client names และ revenue fields

- `README.md`
  - เพิ่มเอกสาร handover สำหรับ branch dashboard

## ไฟล์ที่ตั้งใจไม่แก้

- `src/routeTree.gen.ts`
  - เป็นไฟล์ generated จาก TanStack Router ไม่ควรแก้มือ

- `src/styles.css`
  - มี warning เรื่อง `@import` อยู่เดิม branch นี้ไม่ได้แก้

- `src/hooks/use-auth.tsx`
  - auth และ role handling อยู่นอก scope dashboard

- `src/components/auth/RoleGuard.tsx`
  - role protection เป็น shared infrastructure จึงไม่แตะ

- `src/components/layout/AppShell.tsx`
  - navigation และ layout กลางมีผลหลาย role จึงไม่แก้

- `src/components/auth/DailyReward.tsx`
  - ไม่แก้ reward side effect เดิม และไม่ duplicate logic

- `src/integrations/supabase/types.ts`
  - generated Supabase types ดูเหมือน stale ในบาง field/table แต่ branch นี้ไม่ regenerate

- `supabase/migrations/*`
  - ไม่มี schema หรือ RLS change ใน branch นี้

- `package.json` และ `package-lock.json`
  - ไม่มี dependency change

- AI model files, workers และ `src/routes/client.pose.tsx`
  - ไม่แตะ AI inference logic

- trainer subpages
  - `trainer.bookings.tsx`, `trainer.clients.tsx`, `trainer.earnings.tsx`, `trainer.availability.tsx`, `trainer.chat.tsx` และ `trainer.profile.tsx` ถูก audit แต่ไม่ได้แก้ใน v1.1

## Data Sources

### `profiles`

ใช้สำหรับ:

- ชื่อลูกค้าและข้อมูลโปรไฟล์ใน Client Dashboard
- reward points
- ชื่อลูกค้าเมื่อต้อง resolve booking participant ฝั่ง trainer

field สำคัญ:

- `id`
- `full_name`
- `email`
- `avatar_url`
- `fitness_goal`
- `budget_min`
- `budget_max`
- `preferred_trainer_gender`
- `preferred_experience`
- `experience_level`
- `latitude`
- `longitude`
- `preferred_style`
- `sessions_per_week`
- `training_modality`
- `reward_points`

### `bookings`

ใช้สำหรับ:

- upcoming session ของ client
- pending request ของ trainer
- schedule ของ trainer
- active clients
- revenue จาก completed bookings
- chat eligibility

field สำคัญ:

- `id`
- `client_id`
- `trainer_id`
- `slot_id`
- `booking_status`
- `total_price`
- `commission_amount`
- `net_amount`
- `created_at`

### `availability_slots`

ใช้สำหรับ:

- แสดงวันเวลา booking
- availability health ฝั่ง trainer
- upcoming schedule

field สำคัญ:

- `id`
- `trainer_id`
- `date`
- `start_time`
- `end_time`
- `is_booked`

### `pose_sessions`

ใช้สำหรับ:

- Client AI Form Summary
- Client AI Form Trend
- Client AI-to-Trainer CTA

field สำคัญ:

- `id`
- `client_id`
- `exercise_name`
- `accuracy_score`
- `created_at`

Trainer Dashboard ไม่ query `pose_sessions` ของลูกค้า

### `trainer_profiles`

ใช้สำหรับ:

- Profile / Rating card ฝั่ง trainer
- auto accept
- trainer recommendation ผ่าน `fetchRankedTrainers()`

field สำคัญ:

- `bio`
- `specialties`
- `experience_years`
- `price_per_session`
- `rating`
- `rating_count`
- `gym_name`
- `training_location`
- `auto_accept`

### `notifications`

ใช้โดย:

- trainer inbox ใน `AppShell`

ไม่ได้แก้ใน branch นี้

### `chat_rooms` และ `chat_messages`

ใช้โดย:

- chat page เดิม

ไม่ได้แก้ใน branch นี้ generated types อาจยังไม่มี table เหล่านี้ จึงมี dynamic Supabase casting ในโค้ดเดิม

## ข้อจำกัดที่รู้แล้ว

- Supabase generated types stale สำหรับ field/table ใหม่บางส่วน เช่น chat tables และบาง field ของ `trainer_profiles`
- Trainer AI client alerts ยังไม่ทำ เพราะ trainer access ต่อ `pose_sessions` ของลูกค้ายังไม่ปลอดภัย
- warning เดิมใน `src/styles.css` เรื่อง `@import` ยังอยู่
- source string เดิมบางไฟล์มี mojibake/encoding issue งาน v1.1 เพิ่มข้อความไทยที่สะอาดในไฟล์ที่แก้ แต่ไม่ได้แก้ทั้ง codebase
- dashboard data ยัง query ฝั่ง client ไม่มี server-side aggregation function เพิ่ม
- Revenue Snapshot ไม่สร้าง monthly forecast หรือ projection ปลอม
- Client และ Trainer dashboards ไม่เพิ่ม nutrition, wearable หรือ medical metrics

## แนวทางพัฒนาต่อ

### v1.2

- เพิ่ม recent chat/message preview ใน Trainer Dashboard หากจัดการ typing/access ของ chat tables ได้ปลอดภัย
- เพิ่ม revenue trend chart จาก completed bookings
- ปรับปรุง profile readiness โดยไม่ใช้เปอร์เซ็นต์ปลอม
- เพิ่ม client follow-up list จาก booking history จริง
- ปรับ empty states ใน trainer subpages ให้ดีขึ้น
- พิจารณา extract dashboard card เป็น reusable components หลัง pattern เสถียร

### v2

- เพิ่ม client-approved AI insight sharing สำหรับ trainer
- เพิ่ม AI coaching alerts หลังออกแบบ consent และ RLS แล้ว
- เพิ่ม retention signals สำหรับ trainer
- เพิ่ม marketplace health metrics สำหรับ supply และ booking conversion
- เพิ่ม gym dashboard workflows หาก product scope ต้องการ

### Long-term roadmap

- role-aware marketplace analytics
- consent-driven AI coaching workflow
- trainer-client progress collaboration
- gym operations dashboard
- admin-level funnel analytics ครอบคลุม client, trainer, booking และ AI usage

## กฎการพัฒนาที่ปลอดภัย

- ห้าม fabricate metrics
- ห้ามเพิ่ม nutrition, calories, BMI, body fat, heart rate หรือ medical claims หากไม่มีข้อมูลจริงและ product approval
- ห้ามอ่าน AI data ของ client จาก trainer surface หากยังไม่มี consent และ RLS ที่ถูกต้อง
- ห้ามแก้ generated files เช่น `src/routeTree.gen.ts` หรือ Supabase generated types แบบ casual
- ห้ามแก้ schema/migrations เป็นส่วนหนึ่งของ dashboard UI work เว้นแต่ scope ระบุชัด
- แยกงาน dashboard ตาม role ให้ชัด
- ห้ามแตะ dashboard อื่นหรือ shared auth/layout files หาก task ไม่ได้ขอ
- ใช้ route และ component ที่มีอยู่ก่อนเพิ่ม abstraction ใหม่
- ใช้ honest empty states แทน placeholder ที่ดูเหมือนข้อมูลจริง
- รัน formatting และ build validation ก่อน commit
- stage เฉพาะไฟล์ที่ตั้งใจ commit เท่านั้น
