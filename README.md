# Fitder Dashboard Branch

## Project Overview

Fitder เป็น fitness marketplace ที่เชื่อมต่อผู้ใช้งาน 3 ฝั่งหลัก ได้แก่ ลูกค้า เทรนเนอร์ และยิม โดยมี AI pose analysis เป็นจุดต่างของผลิตภัณฑ์ ลูกค้าสามารถตั้งเป้าหมาย ค้นหาเทรนเนอร์ จองเซสชัน ตรวจฟอร์มด้วย AI และใช้งาน chat หลังมี booking ที่เกี่ยวข้อง ส่วนเทรนเนอร์ใช้ระบบเพื่อเปิดเวลาว่าง รับคำขอจอง ดูแลลูกค้า ติดตามรายได้ และปรับข้อมูลโปรไฟล์ให้พร้อมสำหรับการขาย

Product story หลักของ branch นี้คือ:

- ลูกค้าใช้ Fitder เพื่อรู้ว่าควรทำอะไรต่อในเส้นทาง fitness ของตัวเอง
- AI ช่วยให้ลูกค้าเห็นสัญญาณการฝึกและเชื่อมไปสู่การจองเทรนเนอร์อย่างมีเหตุผล
- เทรนเนอร์เห็นงานที่ต้องทำเพื่อช่วยลูกค้าและสร้างรายได้มากขึ้น
- ยิมยังเป็น stakeholder สำคัญใน marketplace แต่ branch นี้ยังไม่ได้ implement gym dashboard

## Branch Purpose

Branch `dashboard` มีไว้เพื่อปรับปรุง dashboard เท่านั้น เป้าหมายคือเปลี่ยน dashboard จากหน้ารวมตัวเลขแบบ passive ให้เป็น command center ที่ช่วยผู้ใช้งานตัดสินใจว่า “ควรทำอะไรต่อ”

งานใน branch นี้ตั้งใจหลีกเลี่ยงการแก้ schema, migrations, auth, RoleGuard, AppShell, generated Supabase types, AI model files, route generation และหน้าที่ไม่เกี่ยวข้องกับ dashboard โดยเน้นเฉพาะ information architecture, real data mapping, empty states, responsive layout และ product storytelling ที่ปลอดภัย

## Work Completed

### Client Dashboard

ไฟล์หลัก: `src/routes/client.dashboard.tsx`

Client Dashboard ถูกปรับให้เป็น Fitness Command Center โดยใช้ข้อมูลจริงเท่าที่โปรเจกต์มีอยู่แล้ว

สิ่งที่ปรับปรุง:

- **Next Best Action**: แนะนำ action ถัดไปจาก state จริง เช่น กรอกโปรไฟล์ ตรวจท่าด้วย AI จองเทรนเนอร์ หรือดู booking ถัดไป
- **Quick Actions**: เพิ่มทางลัดไป AI Pose Check, Trainer Discovery, Bookings และ Profile
- **Upcoming Session**: ใช้ `bookings` และ `availability_slots` เพื่อแสดงเซสชันที่กำลังจะมาถึง
- **AI Form Summary**: ใช้ `pose_sessions.accuracy_score`, `exercise_name`, `created_at` เพื่อแสดงคะแนนล่าสุด ค่าเฉลี่ย คะแนนดีที่สุด และจำนวน session
- **AI Form Trend**: ใช้ Recharts แสดงคะแนน AI form ล่าสุดจากข้อมูลจริงเท่านั้น ถ้าข้อมูลไม่พอจะไม่สร้างกราฟปลอม
- **Training Activity**: สรุปกิจกรรมจาก AI sessions, bookings, fitness goal และ sessions per week
- **AI to Trainer CTA**: ถ้าคะแนน AI ต่ำจะแนะนำการจองเทรนเนอร์อย่างตรงไปตรงมา ถ้ายังไม่มีคะแนนจะชวนเริ่มตรวจท่าด้วย AI
- **Rewards**: แสดง `profiles.reward_points` โดยไม่ duplicate logic ของ `DailyReward`
- **Trainer Recommendations**: ยังคงใช้ `fetchRankedTrainers()` และ `TrainerCard` แต่ลด priority ลงมาอยู่ช่วงล่างของหน้า
- **Empty States**: เพิ่มสถานะว่างที่ซื่อสัตย์และพาผู้ใช้ไปยัง workflow จริง
- **Responsive Layout**: desktop ใช้แนว 60/40 ส่วน mobile เรียงลำดับ action สำคัญก่อน

เหตุผล:

- Client Dashboard ไม่ควรเป็นแค่หน้ารายชื่อเทรนเนอร์
- AI data ควรนำไปสู่ action ที่มีประโยชน์ ไม่ใช่ metric ปลอม
- Trainer recommendation ยังสำคัญต่อ marketplace แต่ไม่ควรครอบทั้ง dashboard

### Trainer Dashboard

ไฟล์หลัก: `src/routes/trainer.dashboard.tsx`

Trainer Dashboard ถูกปรับให้เป็น Trainer Command Center และผ่าน final visual polish แล้ว เป้าหมายของหน้านี้คือช่วยตอบว่า “วันนี้เทรนเนอร์ควรทำอะไรเพื่อช่วยลูกค้าและสร้างรายได้”

สิ่งที่ implement:

- **Hero + Next Best Action**: จัดลำดับสิ่งที่ควรทำก่อน เช่น ตอบรับ booking, เตรียม session ถัดไป, เพิ่ม availability, อัปเดตโปรไฟล์ หรือดูแลลูกค้า
- **Hero Mini Stats**: แสดง Pending requests, Upcoming sessions และ Active clients จาก count เดิมที่โหลดอยู่แล้ว
- **Pending Booking Requests**: ใช้ booking จริงที่มี status `pending`
- **Today / Upcoming Schedule**: ใช้ `bookings` และ `availability_slots` เพื่อแสดงเซสชันถัดไป
- **Revenue Snapshot**: ใช้ completed bookings เท่านั้น เพื่อแสดง completed sessions, gross revenue, net revenue และ commission
- **Availability Health**: ใช้ availability slots จริงเพื่อแสดง total, booked และ available slots
- **Quick Actions**: ทางลัดไป Manage Bookings, Manage Availability, View Clients และ Open Chat
- **Active Clients**: ใช้ accepted/completed bookings เพื่อแสดงจำนวนและรายชื่อลูกค้าที่ active
- **Profile / Rating**: ใช้ `trainer_profiles` แสดง rating, reviews, price per session, auto accept และคำแนะนำโปรไฟล์
- **AI Coaching Insights**: เป็น roadmap card เท่านั้น ไม่อ่าน `pose_sessions` ของลูกค้า ไม่สร้าง AI alerts ปลอม และสื่อว่า future insight ต้องมี consent และ RLS รองรับ

Final polish ล่าสุด:

- ย้าย `Revenue Snapshot` ไปคอลัมน์ซ้ายใต้ Upcoming Schedule เพื่อบาลานซ์ layout
- ลดช่องว่างของ grid และ card rhythm ให้หน้าไม่โล่งเกินไป
- compact empty states ของ Pending Requests, Upcoming Schedule และ Active Clients
- ทำ Hero ให้ดูเป็น command center มากขึ้น โดย title เด่นขึ้น mini stats scan ง่ายขึ้น และ Next Best Action เชื่อมกับ Hero มากขึ้น
- ลด subtitle ที่ซ้ำหรือไม่ช่วยตัดสินใจ
- ทำ Quick Actions ให้ดูเป็น primary management actions มากขึ้น
- ปรับลำดับ visual hierarchy ของ Profile / Rating เป็น Rating, Reviews, Price, Auto Accept
- ลดความสูงของ AI Coaching Insights ให้เป็น roadmap / coming soon / privacy-first card ที่เบาและชัดเจน

เหตุผล:

- เทรนเนอร์ควรเห็นงานสำคัญและโอกาสรายได้ทันที
- dashboard ต้องช่วยเทรนเนอร์บริหาร booking, availability, ลูกค้า และโปรไฟล์ โดยไม่เพิ่มข้อมูลปลอม
- AI ฝั่ง trainer ต้องเล่า future value อย่างระมัดระวังจนกว่าจะมี consent และ access model ที่ถูกต้อง

## Product Decisions

### ไม่ใช้ metric ปลอม

ทุกตัวเลขใน dashboard ต้องมาจากข้อมูลจริง ถ้าข้อมูลไม่มี ให้แสดง empty state ที่ซื่อสัตย์แทน placeholder ที่ดูเหมือนข้อมูลจริง

### ไม่ทำ nutrition, calories หรือ body metrics

โปรเจกต์ยังไม่มีข้อมูล nutrition, calories, BMI, body fat, heart rate หรือ wearable data ที่เชื่อถือได้ จึงไม่เพิ่ม widget เหล่านี้ และไม่สร้าง medical claim

### ไม่สร้าง streak ปลอม

แม้ระบบมี daily reward/reward points แต่ dashboard ยังไม่ derive workout streak หากข้อมูลไม่ชัดพอ จึงไม่แสดง streak

### ไม่ทำ AI client alerts ฝั่ง trainer ในตอนนี้

Trainer Dashboard ไม่อ่าน `pose_sessions` ของลูกค้า เพราะยังไม่มี consent และ RLS/access model ที่ชัดเจน ฟีเจอร์นี้ถูกเล่าเป็น roadmap เท่านั้น

### ใช้เฉพาะ Supabase data ที่มีอยู่จริง

Client และ Trainer Dashboard ใช้ table/field ที่มีอยู่แล้ว เช่น `profiles`, `bookings`, `availability_slots`, `pose_sessions`, `trainer_profiles` และ function/component เดิม เช่น `fetchRankedTrainers()` และ `TrainerCard`

### เคารพ RLS และ privacy

ข้อมูล AI ของลูกค้าไม่ควรถูกแสดงให้เทรนเนอร์เห็นโดยอัตโนมัติ การแชร์ insight ในอนาคตควรออกแบบบน consent, permission model และ RLS ที่ชัดเจน

## Dashboard Philosophy

Dashboard ไม่ควรเป็นแค่ที่วางข้อมูล แต่ควรช่วยผู้ใช้งานตัดสินใจ

สำหรับ Fitder:

- ลูกค้าควรรู้ว่าควรตรวจท่า จองเทรนเนอร์ ดู booking หรือเติมโปรไฟล์
- เทรนเนอร์ควรรู้ว่าควรตอบรับ booking เพิ่ม availability ดูแลลูกค้า หรือปรับโปรไฟล์
- ทุก widget ควรช่วย inform decision, เพิ่มความมั่นใจ หรือพาไป workflow ที่มีความหมาย

## Files Modified

- `src/routes/client.dashboard.tsx`
  - ปรับ Client Dashboard เป็น fitness command center โดยใช้ข้อมูลจริงจาก profile, bookings, availability slots, pose sessions, rewards และ trainer recommendations

- `src/routes/trainer.dashboard.tsx`
  - ปรับ Trainer Dashboard เป็น trainer command center และทำ final polish ด้าน layout, spacing, hierarchy, empty states, Quick Actions, Profile / Rating และ AI roadmap card

- `README.md`
  - เอกสาร handover ของ branch dashboard อัปเดตให้ตรงกับงานล่าสุด

## Files Intentionally NOT Modified

- `src/routeTree.gen.ts`
  - เป็น generated file จาก TanStack Router ไม่ควรแก้มือ

- `src/styles.css`
  - มี warning เดิมเรื่อง `@import must precede all other statements` แต่ไม่ได้แก้ใน branch นี้

- `src/hooks/use-auth.tsx`
  - auth และ role handling อยู่นอก scope dashboard

- `src/components/auth/RoleGuard.tsx`
  - role protection เป็น shared infrastructure

- `src/components/layout/AppShell.tsx`
  - layout และ navigation กลางกระทบหลาย role

- `src/components/auth/DailyReward.tsx`
  - ไม่ duplicate reward side effect หรือ RPC logic

- `src/integrations/supabase/types.ts`
  - generated Supabase types อาจ stale บางส่วน แต่ไม่ได้ regenerate ใน branch นี้

- `supabase/migrations/*`
  - ไม่มี schema หรือ RLS change ใน branch นี้

- `package.json` และ `package-lock.json`
  - ไม่ตั้งใจเพิ่ม dependency สำหรับ dashboard work นี้

- AI model files, workers และ `src/routes/client.pose.tsx`
  - ไม่แตะ AI inference logic

- trainer subpages
  - `trainer.bookings.tsx`, `trainer.clients.tsx`, `trainer.earnings.tsx`, `trainer.availability.tsx`, `trainer.chat.tsx`, `trainer.profile.tsx` ไม่ถูกแก้ใน Trainer Dashboard v1.1/v1.1.1 polish

## Data Sources

### `profiles`

ใช้สำหรับ:

- Client profile data
- reward points
- resolving client names ใน Trainer Dashboard

Fields ที่เกี่ยวข้อง:

- `id`
- `full_name`
- `email`
- `avatar_url`
- `fitness_goal`
- `sessions_per_week`
- `reward_points`
- preference fields ที่ client dashboard ใช้อยู่

### `bookings`

ใช้สำหรับ:

- upcoming session
- pending booking requests
- trainer schedule
- active clients
- revenue จาก completed bookings

Fields ที่เกี่ยวข้อง:

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

- booking date/time
- upcoming schedule
- availability health

Fields ที่เกี่ยวข้อง:

- `id`
- `trainer_id`
- `date`
- `start_time`
- `end_time`
- `is_booked`

### `pose_sessions`

ใช้เฉพาะ Client Dashboard สำหรับ:

- AI Form Summary
- AI Form Trend
- AI-to-Trainer CTA

Fields ที่เกี่ยวข้อง:

- `id`
- `client_id`
- `exercise_name`
- `accuracy_score`
- `created_at`

Trainer Dashboard ไม่ query `pose_sessions` ของลูกค้า

### `trainer_profiles`

ใช้สำหรับ:

- Profile / Rating card
- price per session
- auto accept
- trainer recommendation ผ่าน logic เดิม

Fields ที่เกี่ยวข้อง:

- `bio`
- `specialties`
- `experience_years`
- `price_per_session`
- `rating`
- `rating_count`
- `gym_name`
- `training_location`
- `auto_accept`

### `notifications`, `chat_rooms`, `chat_messages`

มีใช้งานในส่วนอื่นของโปรเจกต์ เช่น AppShell และ chat pages แต่ dashboard work นี้ไม่ได้แก้ logic เหล่านี้

## Known Limitations

- Supabase generated types อาจ stale สำหรับ field/table บางส่วน
- Trainer AI client alerts ยังไม่ implement เพราะต้องมี consent และ RLS/access model ก่อน
- warning เดิมใน `src/styles.css` เรื่อง `@import` ยังอยู่
- build มี chunk size warning เดิมจาก bundle ขนาดใหญ่
- Wrangler อาจแสดง log permission warning บน Windows แต่ build exit code ยังผ่าน
- Revenue Snapshot ไม่ทำ monthly forecast หรือ projection
- ไม่เพิ่ม nutrition, wearable, body metrics หรือ medical claims
- บาง source string เดิมใน repo อาจมี encoding/mojibake issue แต่ branch นี้ไม่ได้ clean ทั้ง codebase

## Future Improvements

### v1.2

- เพิ่ม recent message preview ใน Trainer Dashboard หาก chat typing/access ชัดเจน
- เพิ่ม revenue trend จาก completed bookings จริง
- ปรับ profile readiness โดยไม่ใช้เปอร์เซ็นต์ปลอม
- เพิ่ม client follow-up list จาก booking history จริง
- ปรับ empty states ใน trainer subpages
- พิจารณา extract dashboard cards เป็น reusable components หลัง pattern เสถียร

### v2

- เพิ่ม client-approved AI insight sharing สำหรับ trainer
- เพิ่ม AI coaching alerts หลังออกแบบ consent และ RLS แล้ว
- เพิ่ม retention signals สำหรับ trainer
- เพิ่ม marketplace health metrics สำหรับ supply และ booking conversion
- เพิ่ม gym dashboard workflows เมื่อ product scope พร้อม

### Long-term Roadmap

- role-aware marketplace analytics
- consent-driven AI coaching workflow
- trainer-client progress collaboration
- gym operations dashboard
- admin-level funnel analytics ครอบคลุม client, trainer, booking และ AI usage

## Safe Development Rules

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

## Latest Validation Notes

Trainer Dashboard final polish ตรวจแล้วด้วย:

- `npx.cmd prettier --check src/routes/trainer.dashboard.tsx`
- `git diff --check`
- `npm.cmd run build`

ผลลัพธ์ล่าสุด: build ผ่าน exit code 0 โดยยังมี warning เดิมของโปรเจกต์ ได้แก่ CSS `@import`, chunk size และ Wrangler log permission บน Windows
