# Fitder Dashboard Branch

README นี้เป็นเอกสารส่งต่องานของ branch `dashboard` ไม่ใช่คู่มือติดตั้งโปรเจกต์ จุดประสงค์คือให้คนที่มารับงานต่อเข้าใจว่าเราแก้ dashboard อะไรไปแล้วบ้าง ทำไมถึงแก้แบบนี้ ใช้ข้อมูลจากไหน และมีข้อควรระวังอะไร

## ภาพรวมสั้น ๆ

Fitder เป็น fitness marketplace ที่เชื่อมลูกค้า เทรนเนอร์ และยิมเข้าด้วยกัน โดยมี AI pose analysis เป็นจุดต่างของ product

ใน branch นี้ เราโฟกัสเฉพาะ dashboard เพื่อเปลี่ยนจากหน้าที่แค่แสดงข้อมูล ให้กลายเป็น command center ที่ตอบคำถามสำคัญของผู้ใช้:

- ลูกค้า: “วันนี้ฉันควรทำอะไรต่อเพื่อพัฒนาการฝึก?”
- เทรนเนอร์: “วันนี้ฉันควรทำอะไรเพื่อช่วยลูกค้าและสร้างรายได้?”

งานนี้ไม่ได้แตะ schema, migrations, auth, RoleGuard, AppShell, generated types, AI model files หรือ route generation

## Scope ของ branch นี้

แก้หลัก ๆ ที่:

- `src/routes/client.dashboard.tsx`
- `src/routes/trainer.dashboard.tsx`
- `README.md`

ตั้งใจไม่แก้:

- `src/routeTree.gen.ts`
- `src/styles.css`
- `src/hooks/use-auth.tsx`
- `src/components/auth/RoleGuard.tsx`
- `src/components/layout/AppShell.tsx`
- `src/components/auth/DailyReward.tsx`
- `src/integrations/supabase/types.ts`
- `supabase/migrations/*`
- AI model / worker files
- trainer subpages เช่น bookings, clients, earnings, availability, chat, profile
- gym/admin pages

## สิ่งที่ทำใน Client Dashboard

ไฟล์: `src/routes/client.dashboard.tsx`

เราเปลี่ยน Client Dashboard ให้เป็น Fitness Command Center แทนที่จะเป็นแค่พื้นที่แนะนำเทรนเนอร์

สิ่งที่เพิ่ม/ปรับ:

- **Next Best Action**  
  แนะนำ action ถัดไปจาก state จริง เช่น กรอกโปรไฟล์ เริ่ม AI Pose Check จองเทรนเนอร์ หรือดู booking ถัดไป

- **Quick Actions**  
  เพิ่มทางลัดไป AI Pose Check, Discover Trainer, Bookings และ Profile

- **Upcoming Session**  
  ใช้ข้อมูล `bookings` และ `availability_slots` เพื่อแสดงเซสชันที่กำลังจะมาถึง

- **AI Form Summary**  
  ใช้ข้อมูลจริงจาก `pose_sessions` เช่น `accuracy_score`, `exercise_name`, `created_at` เพื่อแสดงคะแนนล่าสุด ค่าเฉลี่ย คะแนนดีที่สุด และจำนวน session

- **AI Form Trend Chart**  
  ใช้ Recharts แสดงคะแนน AI form ล่าสุดจากข้อมูลจริงเท่านั้น ถ้าข้อมูลไม่พอจะไม่สร้างกราฟปลอม

- **Training Activity Summary**  
  สรุป activity จาก AI sessions, bookings, goal และ sessions per week

- **AI to Trainer CTA**  
  ถ้าคะแนน AI ต่ำ จะแนะนำให้จองเทรนเนอร์เพื่อช่วยปรับฟอร์ม ถ้ายังไม่มีข้อมูล AI จะชวนให้เริ่มตรวจท่าก่อน

- **Rewards Card**  
  แสดง `profiles.reward_points` เท่านั้น ไม่ duplicate logic ของ `DailyReward`

- **Trainer Recommendations**  
  ยังใช้ `fetchRankedTrainers()` และ `TrainerCard` เดิม แต่ย้ายลงไปเป็น section ลำดับรอง

- **Empty States**  
  เพิ่ม empty states ที่ซื่อสัตย์ เช่น ไม่มี AI data, ไม่มี booking, ไม่มีข้อมูลพอทำ chart

เหตุผลหลัก:

- Client Dashboard ควรเล่า journey ของลูกค้า ไม่ใช่เป็นแค่ trainer recommendation page
- AI ควรเชื่อมไปสู่ action ที่มี business value เช่น booking
- ทุก metric ต้องมาจากข้อมูลจริงเท่านั้น

## สิ่งที่ทำใน Trainer Dashboard

ไฟล์: `src/routes/trainer.dashboard.tsx`

เราเปลี่ยน Trainer Dashboard ให้เป็น Trainer Command Center โดยให้หน้าแรกตอบว่าเทรนเนอร์ควรทำอะไรต่อเพื่อช่วยลูกค้าและสร้างรายได้

สิ่งที่เพิ่ม/ปรับ:

- **Hero + Next Best Action**  
  แนะนำ action ถัดไปตาม priority:
  pending booking, upcoming session, no availability, profile incomplete, หรือให้ดูแลลูกค้า

- **Hero Mini Stats**  
  แสดงจำนวน Pending requests, Upcoming sessions และ Active clients จากข้อมูลที่โหลดอยู่แล้ว

- **Pending Booking Requests**  
  ใช้ booking จริงที่มี status `pending`

- **Upcoming Schedule**  
  ใช้ `bookings` + `availability_slots` เพื่อแสดงเซสชันที่กำลังจะมาถึง

- **Revenue Snapshot**  
  ใช้ completed bookings เท่านั้น เพื่อแสดงจำนวน completed sessions, gross revenue, net revenue และ commission

- **Availability Health**  
  ใช้ availability slots จริงเพื่อแสดง total slots, booked slots และ available slots

- **Quick Actions**  
  ปุ่มไป Manage Bookings, Manage Availability, View Clients และ Open Chat

- **Active Clients**  
  ใช้ accepted/completed bookings เพื่อแสดงจำนวนและรายชื่อลูกค้าที่ active

- **Profile / Rating**  
  ใช้ `trainer_profiles` แสดง rating, reviews, price per session, auto accept และคำแนะนำโปรไฟล์

- **AI Coaching Insights**  
  เป็น roadmap card เท่านั้น ยังไม่อ่าน `pose_sessions` ของลูกค้า และไม่สร้าง AI alerts ปลอม

## Trainer Dashboard final polish ล่าสุด

หลังจากทำ v1.1 แล้ว มีการ polish รอบสุดท้ายเพื่อให้หน้าดูเป็น SaaS dashboard ที่พร้อมส่งมากขึ้น

สิ่งที่ polish:

- ย้าย `Revenue Snapshot` ไปอยู่คอลัมน์ซ้ายใต้ Upcoming Schedule เพื่อให้ left/right columns สมดุลขึ้น
- ลดช่องว่างระหว่าง cards และลดความสูงของ empty states
- ทำ Hero ให้เด่นขึ้น และให้ Next Best Action ดูเชื่อมกับ Hero มากขึ้น
- ทำ mini stats ใน Hero ให้ scan ง่ายขึ้น
- ลด subtitle ที่ซ้ำหรือไม่ได้ช่วยให้ผู้ใช้ตัดสินใจ
- ทำ Quick Actions ให้ดูเป็น management actions มากขึ้น
- ปรับ Profile / Rating hierarchy เป็น Rating, Reviews, Price, Auto Accept
- ทำ AI Coaching Insights ให้เป็น roadmap / coming soon / privacy-first card ที่เบาลง

ไม่มีการเพิ่ม query ใหม่ในรอบ polish นี้

## Data ที่ใช้

### `profiles`

ใช้สำหรับ:

- ข้อมูลโปรไฟล์ลูกค้า
- reward points
- resolve ชื่อลูกค้าใน Trainer Dashboard

Fields ที่เกี่ยวข้อง:

- `id`
- `full_name`
- `fitness_goal`
- `sessions_per_week`
- `reward_points`
- preference fields ที่ client dashboard ใช้อยู่

### `bookings`

ใช้สำหรับ:

- upcoming session
- pending booking requests
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
- AI to Trainer CTA

Fields ที่เกี่ยวข้อง:

- `id`
- `client_id`
- `exercise_name`
- `accuracy_score`
- `created_at`

Trainer Dashboard ไม่ query `pose_sessions` ของลูกค้า

### `trainer_profiles`

ใช้สำหรับ:

- Profile / Rating
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

## Product decisions ที่สำคัญ

### ไม่สร้าง metric ปลอม

ถ้าไม่มีข้อมูลจริง จะใช้ empty state แทน ไม่สร้าง placeholder ที่ดูเหมือนข้อมูลจริง

### ไม่เพิ่ม nutrition หรือ body metrics

ยังไม่มีข้อมูล calories, macros, BMI, body fat, heart rate หรือ wearable data ที่เชื่อถือได้ จึงไม่เพิ่ม widget เหล่านี้

### ไม่สร้าง streak

ยังไม่มี logic ที่ derive streak ได้อย่างมั่นใจจากข้อมูลจริง จึงไม่แสดง workout streak

### ไม่ทำ AI client alerts ฝั่ง trainer

Trainer ยังไม่ควรเห็น AI pose data ของลูกค้าโดยไม่มี consent และ RLS/access model ที่ชัดเจน ตอนนี้จึงทำเป็น roadmap card เท่านั้น

### ไม่ duplicate DailyReward logic

Dashboard แสดง reward points ได้ แต่ไม่สร้าง daily login RPC หรือ side effect ซ้ำ

## Known limitations

- Supabase generated types อาจ stale ในบาง table/field
- `src/styles.css` ยังมี warning เดิมเรื่อง `@import must precede all other statements`
- build ยังมี chunk size warning เดิม
- Wrangler อาจมี log permission warning บน Windows แต่ build ยังผ่าน
- Trainer AI alerts ยังไม่ทำจนกว่าจะมี consent + RLS ที่ถูกต้อง
- Revenue Snapshot ไม่ใช่ monthly forecast และไม่ใช่ projection
- ไม่ได้ clean encoding/mojibake ทั้ง codebase

## สิ่งที่ควรทำต่อ

### v1.2

- เพิ่ม recent message preview ถ้า chat access ชัดเจน
- เพิ่ม revenue trend จาก completed bookings จริง
- เพิ่ม client follow-up list จาก booking history จริง
- ปรับ empty states ใน trainer subpages
- พิจารณา extract dashboard cards เป็น reusable components

### v2

- client-approved AI insight sharing
- AI coaching alerts หลังมี consent/RLS
- trainer-client progress collaboration
- marketplace health metrics
- gym dashboard workflows

## Safe development rules

- ห้าม fabricate metrics
- ห้ามเพิ่ม medical/nutrition/body metrics โดยไม่มีข้อมูลจริง
- ห้ามอ่าน AI data ของลูกค้าจาก trainer surface โดยไม่มี consent และ RLS
- ห้ามแก้ generated files แบบ casual
- ห้ามแก้ schema/migrations ใน dashboard UI task
- ห้ามแตะ auth, RoleGuard, AppShell หาก task ไม่ได้ขอ
- ใช้ข้อมูลจริงและ honest empty states
- stage เฉพาะไฟล์ที่ตั้งใจ commit
- รัน validation ก่อน commit

## Validation ล่าสุด

Trainer Dashboard final polish ตรวจแล้วด้วย:

```powershell
npx.cmd prettier --check src/routes/trainer.dashboard.tsx
git diff --check
npm.cmd run build
```

ผลลัพธ์:

- Prettier ผ่าน
- `git diff --check` ผ่าน
- `npm run build` ผ่าน exit code 0
- ยังมี warning เดิมของโปรเจกต์: CSS `@import`, chunk size และ Wrangler log permission บน Windows
