export interface ScheduleResult {
  actualStartDate: Date;
  endDate: Date;
  workingMinutes: number;
  totalMinutes: number;
}

export function calculateProductionSchedule(
  startDate: Date,
  targetQty: number,
  ratePerHour: number,
  allowDayOT: boolean,
  allowNightOT: boolean,
  run24Hours: boolean = false
): ScheduleResult {
  if (ratePerHour <= 0 || targetQty <= 0) {
    return { actualStartDate: startDate, endDate: startDate, workingMinutes: 0, totalMinutes: 0 };
  }

  let minutesNeeded = (targetQty / ratePerHour) * 60;

  if (run24Hours) {
    let endDate = new Date(startDate.getTime() + minutesNeeded * 60000);
    return {
      actualStartDate: startDate,
      endDate: endDate,
      workingMinutes: minutesNeeded,
      totalMinutes: minutesNeeded
    };
  }

  let currentDate = new Date(startDate);
  let actualStartDate: Date | null = null;
  let workingMinutes = 0;
  let totalMinutes = 0;

  const getMinutesFromMidnight = (d: Date) => d.getHours() * 60 + d.getMinutes();

  // Safety counter to prevent infinite loops
  let iterations = 0;
  const MAX_ITERATIONS = 10000;

  while (minutesNeeded > 0 && iterations < MAX_ITERATIONS) {
    iterations++;
    
    const periods = [
      { start: 0, end: 60, type: 'break', name: 'พักเบรกกะดึก' }, // 00:00 - 01:00
      { start: 60, end: 300, type: 'work', name: 'กะดึก (ช่วง 2)' }, // 01:00 - 05:00
      { start: 300, end: 480, type: allowNightOT ? 'work' : 'skip', name: 'OT กะดึก' }, // 05:00 - 08:00
      { start: 480, end: 720, type: 'work', name: 'กะเช้า (ช่วง 1)' }, // 08:00 - 12:00
      { start: 720, end: 780, type: 'break', name: 'พักเบรกกะเช้า' }, // 12:00 - 13:00
      { start: 780, end: 1020, type: 'work', name: 'กะเช้า (ช่วง 2)' }, // 13:00 - 17:00
      { start: 1020, end: 1200, type: allowDayOT ? 'work' : 'skip', name: 'OT กะเช้า' }, // 17:00 - 20:00
      { start: 1200, end: 1440, type: 'work', name: 'กะดึก (ช่วง 1)' } // 20:00 - 00:00
    ];

    let currentMins = getMinutesFromMidnight(currentDate);
    let currentPeriod = periods.find(p => currentMins >= p.start && currentMins < p.end);

    if (!currentPeriod) {
      if (currentMins >= 1440) {
        currentDate.setHours(0, 0, 0, 0);
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }
    }

    let minsLeftInPeriod = currentPeriod!.end - currentMins;

    if (currentPeriod!.type === 'work') {
      if (!actualStartDate) {
        actualStartDate = new Date(currentDate);
      }
      let minsToWork = Math.min(minsLeftInPeriod, minutesNeeded);
      currentDate.setMinutes(currentDate.getMinutes() + minsToWork);
      minutesNeeded -= minsToWork;
      workingMinutes += minsToWork;
      totalMinutes += minsToWork;
    } else {
      currentDate.setMinutes(currentDate.getMinutes() + minsLeftInPeriod);
      if (actualStartDate) {
        totalMinutes += minsLeftInPeriod;
      }
    }
  }

  return {
    actualStartDate: actualStartDate || startDate,
    endDate: currentDate,
    workingMinutes,
    totalMinutes
  };
}
