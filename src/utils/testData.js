// testData.js — fills every field on every page for dev/testing

export const TEST_DATA = {
  home_tasks: [
    { id: 1, text: 'Read Humanities Ch.3 — The Renaissance', course: 'HUM', done: false },
    { id: 2, text: 'Draft discussion post — Written Comm Week 2', course: 'WCOM', done: true },
    { id: 3, text: 'Review A&P lecture notes — skeletal system', course: 'ANP', done: false },
    { id: 4, text: 'Complete American Gov reading pp.44-67', course: 'GOV', done: false },
    { id: 5, text: 'Submit essay outline by midnight', course: 'WCOM', done: true },
  ],
  assignments: [
    { id: 1,  title: 'Discussion Post Week 1', course: 'Humanities', type: 'Discussion Post', due: '2026-05-19', status: 'Done',        notes: 'Submitted on time' },
    { id: 2,  title: 'Essay Draft 1',          course: 'Written Communication', type: 'Essay', due: '2026-05-21', status: 'In progress', notes: 'Intro and body done, need conclusion' },
    { id: 3,  title: 'Midterm Essay',          course: 'Humanities', type: 'Exam', due: '2026-06-02', status: 'To do', notes: '' },
    { id: 4,  title: 'Discussion Post Week 2', course: 'Written Communication', type: 'Discussion Post', due: '2026-05-26', status: 'To do', notes: '' },
    { id: 5,  title: 'Final Essay',            course: 'Humanities', type: 'Essay', due: '2026-06-16', status: 'To do', notes: 'Worth 30% of grade' },
    { id: 6,  title: 'Grammar Quiz 1',         course: 'Written Communication', type: 'Quiz', due: '2026-05-28', status: 'To do', notes: '' },
    { id: 7,  title: 'A&P Lab Report 1',       course: 'A&P Lab', type: 'Lab Report', due: '2026-09-15', status: 'To do', notes: 'Skeletal system' },
    { id: 8,  title: 'Gov Chapter Quiz',       course: 'American Government', type: 'Quiz', due: '2026-09-10', status: 'To do', notes: '' },
    { id: 9,  title: 'A&P Midterm',            course: 'Anatomy & Physiology', type: 'Exam', due: '2026-10-05', status: 'To do', notes: 'Chapters 1-8' },
    { id: 10, title: 'Reading Response 1',     course: 'Humanities', type: 'Reading Response', due: '2026-05-23', status: 'Done', notes: '' },
  ],
  study_sessions: [
    { id: 1, course: 'Humanities',            mins: 25, date: 'May 17', recall: 'The Renaissance began in Florence due to merchant wealth funding the arts and sciences.' },
    { id: 2, course: 'Written Communication', mins: 25, date: 'May 17', recall: 'Thesis statements need to be arguable, specific, and supported by evidence.' },
    { id: 3, course: 'Humanities',            mins: 50, date: 'May 16', recall: 'Greek philosophy influenced Roman governance through natural law concepts.' },
    { id: 4, course: 'Anatomy & Physiology',  mins: 25, date: 'May 15', recall: 'The axial skeleton includes the skull, vertebral column, and rib cage — 80 bones total.' },
    { id: 5, course: 'American Government',   mins: 25, date: 'May 15', recall: 'The Constitution has 7 articles and 27 amendments. First 10 are the Bill of Rights.' },
    { id: 6, course: 'Written Communication', mins: 25, date: 'May 14', recall: 'APA format: Author last name, first initial. Year. Title. Journal, volume(issue), pages.' },
  ],
  habit_grid: {
    1: [true,  true,  true,  false, true,  true,  false],
    2: [true,  false, true,  true,  false, true,  true ],
    3: [false, true,  false, true,  true,  false, true ],
    4: [true,  true,  true,  false, false, true,  false],
  },
  timer_settings: { focus: 25, short: 5, long: 15 },
  quick_links: [
    { id: 1, label: 'SCF Planner', url: 'https://teamsleep47.github.io/scf-planner/', emoji: '🎓' },
    { id: 2, label: 'Canvas',      url: 'https://canvas.instructure.com',              emoji: '📋' },
    { id: 3, label: 'Gmail',       url: 'https://mail.google.com',                     emoji: '✉️' },
    { id: 4, label: 'Khan Academy',url: 'https://khanacademy.org',                     emoji: '📖' },
  ],
  streak: 7,
  weather_city: 'Bradenton',
}
