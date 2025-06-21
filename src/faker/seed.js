import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { faker } from '@faker-js/faker';

import Student from '../models/Student.js';
import Shift from '../models/Shift.js';
import Test from '../models/Test.js';

dotenv.config();
await mongoose.connect(process.env.MONGO_URI);

// Cleanup
await Student.deleteMany({});
await Shift.deleteMany({});
await Test.deleteMany({});

// 1. Create 50 Students
const students = [];
for (let i = 0; i < 50; i++) {
  const student = new Student({
    name: faker.person.fullName(),
    email: faker.internet.email(),
    isApproved: faker.datatype.boolean(),
    isOnlineMode: faker.datatype.boolean(),
    isBlocked: faker.datatype.boolean()
  });
  students.push(student);
}
await Student.insertMany(students);
console.log('✅ Inserted 50 students');

// 2. Create 4 Shifts
const shifts = [];
const shiftNames = ['Morning 9AM', 'Afternoon 1PM', 'Evening 5PM', 'Night 9PM'];

for (let i = 0; i < 4; i++) {
  const shift = new Shift({
    name: shiftNames[i],
    startTime: faker.date.future(),
    durationMinutes: faker.helpers.arrayElement([15, 30, 45]),
    date: faker.date.future()
  });
  shifts.push(shift);
}
await Shift.insertMany(shifts);
console.log('✅ Inserted 4 shifts');

// 3. Create 10 Tests
const tests = [];
for (let i = 0; i < 10; i++) {
  const test = new Test({
    title: `Test ${i + 1}`,
    referenceText: faker.lorem.paragraphs(2),
    audioURL: `/uploads/audios/fake${i + 1}.mp3`, // Placeholder
    uploadedBy: null // Assign admin ID if available
  });
  tests.push(test);
}
await Test.insertMany(tests);
console.log('✅ Inserted 10 tests');

// 4. Optionally assign students to random shifts
const allStudents = await Student.find();
const allShifts = await Shift.find();

for (const student of allStudents) {
  const shiftCount = faker.number.int({ min: 1, max: 3 });
  const randomShifts = faker.helpers.arrayElements(allShifts, shiftCount);
  student.assignedShifts = randomShifts.map((s) => s._id);
  await student.save();
}
console.log('✅ Assigned shifts to students');

await mongoose.disconnect();
console.log('🚀 Done seeding!');
