# Co che random thu hang trong Race Simulation

## 1. Ket luan ngan

Trong project hien tai, phan **simulation/replay tam thoi** co tu sinh thu hang va thoi gian ve dich. Tuy nhien day khong phai la random hoan toan. He thong tinh diem chay cua moi ngua dua tren rating, speed, stamina, form, handicap/can nang, sau do cong them mot phan ngau nhien nho goi la `raceVariance`.

Ket qua official thi khac: referee van phai nhap `position` va `finishTime`, roi Admin approve. Simulation chi giup hien thi replay tam thoi va tao cam giac cuoc dua co bien dong.

## 2. Code nam o dau?

Phan backend tao simulation/replay tam thoi nam trong file:

```txt
backend/src/services/raceReplayTimeline.js
```

Ham chinh:

```js
buildProvisionalRaceTimeline(...)
```

Ham nay duoc goi khi Admin start race trong file:

```txt
backend/src/routes/adminRoutes.js
```

Cu the, luc `start-race`, backend gan:

```js
race.replayTimeline = buildProvisionalRaceTimeline({
  race,
  entries,
  horses: db.horses,
});
```

Ngoai ra frontend cung co ban simulation tuong tu trong file:

```txt
frontend/src/app/utils/raceSimulation.ts
```

Ham frontend:

```ts
createRaceSimulationPlan(...)
```

## 3. Cong thuc tinh diem simulation

Moi runner duoc tinh mot diem goi la `performanceScore`:

```txt
performanceScore =
  rating * 0.45
+ speed * 0.20
+ stamina * 0.20
+ form * 0.15
- weightPenalty
+ raceVariance
```

Y nghia tung phan:

```txt
rating        : chi so tong quan cua ngua
speed         : toc do
stamina       : suc ben
form          : phong do hien tai
weightPenalty : diem phat do handicap/can nang
raceVariance  : bien ngau nhien de race kho doan hon
```

## 4. raceVariance la gi?

Trong code hien tai:

```js
const raceVariance = (random() - 0.5) * 7;
```

Ham `random()` tra ve gia tri tu `0` den gan `1`.

Nen:

```txt
random() - 0.5  =>  tu -0.5 den +0.5
(random() - 0.5) * 7  =>  tu -3.5 den +3.5
```

Vi vay `raceVariance` co the lam diem cua ngua giam toi da khoang `-3.5` diem hoac tang toi da khoang `+3.5` diem.

No tao yeu to bat ngo, nhung khong du lon de bien mot con qua yeu thanh chac chan thang neu chenh lech chi so qua cao.

## 5. Vi du de hieu

Gia su co 2 ngua:

```txt
Horse A:
rating  = 85
speed   = 86
stamina = 84
form    = 83
weightPenalty = 2

Horse B:
rating  = 82
speed   = 83
stamina = 82
form    = 80
weightPenalty = 1
```

Diem chua tinh random:

```txt
Horse A =
85 * 0.45 + 86 * 0.20 + 84 * 0.20 + 83 * 0.15 - 2
= 82.7

Horse B =
82 * 0.45 + 83 * 0.20 + 82 * 0.20 + 80 * 0.15 - 1
= 80.9
```

Neu random nhu sau:

```txt
Horse A raceVariance = -2.5
Horse B raceVariance = +2.0
```

Diem cuoi cung:

```txt
Horse A = 82.7 - 2.5 = 80.2
Horse B = 80.9 + 2.0 = 82.9
```

Luc nay Horse B co the vuot Horse A trong simulation, du Horse A co chi so goc cao hon. Day la muc dich cua `raceVariance`: tao bien dong nho de race khong qua may moc.

## 6. Tu diem sang thoi gian va thu hang

Sau khi co `performanceScore`, he thong tinh trung binh ca field:

```js
const fieldAverageScore =
  scoredRunners.reduce((total, runner) => total + runner.performanceScore, 0) /
  scoredRunners.length;
```

Roi tinh he so toc do:

```js
const abilitySpeedFactor =
  1 + (runner.performanceScore - fieldAverageScore) * 0.004;
```

Neu diem cua ngua cao hon trung binh, `abilitySpeedFactor` lon hon 1, nen thoi gian ve dich se thap hon:

```js
const desiredFinishTime =
  baseFinishTime / abilitySpeedFactor + (random() - 0.5) * 0.12;
```

Sau do thu hang duoc sap xep theo `finishTimeSeconds`:

```txt
finishTimeSeconds nho hon => ve dich som hon => thu hang cao hon
```

## 7. Tom tat de noi khi thuyet trinh

Simulation cua he thong khong random thu hang mot cach tuy tien. No lay chi so cua ngua gom rating, speed, stamina, form va can nang de tinh mot `performanceScore`. Sau do he thong cong them `raceVariance`, la mot bien ngau nhien nho trong khoang khoang `-3.5` den `+3.5`, de tao bat ngo cho cuoc dua. Ngua co diem cuoi cung cao hon se co thoi gian ve dich thap hon, va tu do co thu hang cao hon. Con ket qua official thi khong lay tu random nay, ma do referee nhap position va finish time, sau do Admin xac nhan.
