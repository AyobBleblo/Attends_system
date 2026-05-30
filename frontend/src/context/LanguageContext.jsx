import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Translation dictionary
// ─────────────────────────────────────────────────────────────────────────────
export const translations = {
  en: {
    // ── Sidebar ──
    dashboard:        'Dashboard',
    reports:          'Reports',
    myCourses:        'My Courses',
    myAttendance:     'My Attendance',
    darkMode:         'Dark Mode',
    lightMode:        'Light Mode',
    changePassword:   'Change Password',
    logout:           'Logout',
    language:         'العربية',

    // ── Login ──
    welcomeBack:      'Welcome Back',
    signInDesc:       'Sign in to access your dashboard',
    username:         'Username',
    password:         'Password',
    enterUsername:    'Enter your username',
    enterPassword:    'Enter your password',
    signIn:           'Sign In',
    authenticating:   'Authenticating...',
    copyright:        '© ALARAB MEDICAL UNIVERSITY FOR SCIENCE AND TECHNOLOGY',
    invalidCreds:     'Invalid username or password.',
    accountNotLinked: 'Account not linked to a profile. Please contact administration.',

    // ── Professor ──
    professorDashboard: 'Professor Dashboard',
    welcomeProfessor:   'Welcome back',
    yourCourses:        'Your Courses',
    refresh:            'Refresh',
    noCoursesAssigned:  'No courses assigned this semester.',
    contactAdminCourse: 'Contact the admin to assign you a course.',
    courseSemester:     (n) => `${n} Course${n !== 1 ? 's' : ''} this semester`,
    cachedData:         'Could not refresh — showing cached data.',

    // ── Student ──
    studentPortal:      'Student Portal',
    welcomeStudent:     'Hello',
    myEnrolledCourses:  'My Enrolled Courses',
    notEnrolled:        'You are not enrolled in any courses this semester.',
    contactAdminEnroll: 'Contact the admin to enroll you.',
    coursesEnrolled:    (n) => `${n} courses enrolled.`,
    scanInfo:           'Tap Scan Attendance on any card when your professor opens a session.',
    scanAttendance:     'Scan Attendance',
    recordingAttendance:'Recording attendance…',

    // ── Scan result ──
    attendanceRecorded: 'Attendance Recorded!',
    scanFailed:         'Scan Failed',
    close:              'Close',

    // ── Device mismatch ──
    deviceNotRecognised:'Device Not Recognised',
    deviceBody:         'Your attendance was refused because this QR scan was submitted from an unrecognised device.',
    whatToDo:           'What to do:',
    deviceInstructions: 'Contact your professor or the admin and ask them to Reset your Device Fingerprint. Once reset, you can scan from this new device.',
    understood:         'Understood',

    // ── Manual modal ──
    enterQrToken:  'Enter QR Token',
    qrTokenCode:   'QR Token Code',
    pasteToken:    'Paste or type the token…',
    submitAtt:     'Submit Attendance',
    submitting:    'Submitting…',

    // ── Admin ──
    adminDashboard:  'Admin Dashboard',
    adminDesc:       'Manage users, courses, assignments, and enrollments.',
    search:          'Search',
    addNew:          'Add New',
    refresh2:        'Refresh',
    smartAssign:     'Smart Assign',
    actions:         'Actions',
    delete:          'Delete',
    export:          'Export',
    assign:          'Assign',
    selected:        (n) => `${n} selected`,
    deleteRecord:    'Delete this record?',
    noData:          'No data found.',
    tryAdjusting:    'Try adjusting your search or filters.',
    clearFilters:    'Clear filters',
    showHeatmap:     'Show Attendance Heatmap',
    hideHeatmap:     'Hide Attendance Heatmap',

    // ── Tabs ──
    students:     'Students',
    professors:   'Professors',
    courses:      'Courses',
    assignments:  'Assignments',
    enrollments:  'Enrollments',
    semesters:    'Semesters',
    departments:  'Departments',
    majors:       'Majors',

    // ── Stats ──
    statStudents:    'Students',
    statProfessors:  'Professors',
    statCourses:     'Courses',
    statEnrollments: 'Enrollments',

    // ── Table columns ──
    colID:          'ID',
    colUsername:    'Username',
    colName:        'Name',
    colDepartment:  'Department',
    colMajor:       'Major',
    colYear:        'Year',
    colCode:        'Code',
    colStudyYear:   'Study Year',
    colProfessors:  'Professors',
    colProfessor:   'Professor',
    colCourseCode:  'Course Code',
    colCourseName:  'Course Name',
    colSemester:    'Semester',
    colStudent:     'Student',
    colCourse:      'Course',
    colStartDate:   'Start Date',
    colEndDate:     'End Date',
    colTotalLec:    'Total Lectures',
    colActive:      'Active',
    colActions:     'Actions',
    yes:            'Yes',
    no:             'No',

    // ── Change Password ──
    changePasswordTitle: 'Change Password',
    currentPassword:     'Current Password',
    newPassword:         'New Password',
    confirmNewPassword:  'Confirm New Password',
    passwordUpdated:     'Password Updated!',
    passwordSuccess:     'Your password has been changed successfully.',
    updatePassword:      'Update Password',
    saving:              'Saving...',
    passwordMismatch:    'New passwords do not match.',

    // ── Majors Manager ──
    majorsManager:  'Majors Manager',
    majorsDesc:     'Securely view, add, or delete majors without misclicking row cells.',
    selectDept:     '1. Select Department',
    addDepartment:  'Add Department',
    addMajor:       'Add Major',
    editMajor:      'Edit Major',
    deleteMajor:    'Delete Major',
    manageMajor:    'Manage Major',
    majorName:      'Major Name',
    confirmDeleteMajor: 'Delete this major? This will affect students assigned to it.',
    majorAdded:     'Major added successfully!',
    majorUpdated:   'Major updated successfully!',
    majorDeleted:   'Major deleted successfully!',
    noMajors:       'No majors yet. Click "Add Major" to create one.',
    filterByDept:   'Filter by Department',
    selectPage:     '— Select —',
    pagePrev:       '← Previous',
    pageNext:       'Next →',
    showingPage:    'Showing page',
    of:             'of',
    studentsTotal:  'students total',

    // ── Breadcrumb ──
    breadcrumbDashboard: 'Dashboard',

    roleAdmin:     'admin',
    roleProfessor: 'professor',
    roleStudent:   'student',

    // ── Cascade Filters ──
    filters:        'Filters',
    allDepartments: 'All Departments',
    allYears:       'All Years',
    allProfessors:  'All Professors',
    allMajors:      'All Majors',
    clearAll:       'Clear all',

    // ── Admin Report ──
    adminReport:         'Admin Attendance Report',
    adminReportDesc:     'Select a professor and course to view & export the attendance report',
    filterProfCourse:    'Filter by Professor & Course',
    selectProfessor:     '1 · Select Professor',
    selectCourse:        '2 · Select Course',
    chooseProfessor:     '— Choose a professor —',
    chooseCourse:        '— Choose a course —',
    searchStudents:      'Search Students',
    nameOrId:            'Name or ID…',
    loadReport:          'Load Report',
    loading:             'Loading…',
    exportCsv:           'Export CSV',
    reportFor:           'Report For',
    sessionsHeld:        'Sessions Held',
    lectureQuota:        'Lecture Quota',
    instructorHours:     'Instructor Hours',
    studentsLabel:       'Students',
    noStudentsMatch:     'No students match your search.',
    showingOf:           (f, t) => `Showing ${f} of ${t} students — click a row to expand lecture details ↓`,
    lectureGrid:         (held, quota) => `Lecture attendance grid (${held} held / ${quota} total quota)`,
    noCourses:           'No courses found for this professor in the active semester.',
    selectCoursePrompt:  'Now select a course to generate the attendance report.',
    startByProf:         'Start by selecting a professor above.',
    resetDevice:         'Reset Device',
    present:             'Present',
    absent:              'Absent',
    rate:                'Rate',
  },

  ar: {
    // ── Sidebar ──
    dashboard:        'لوحة التحكم',
    reports:          'التقارير',
    myCourses:        'موادي',
    myAttendance:     'حضوري',
    darkMode:         'الوضع المظلم',
    lightMode:        'الوضع الفاتح',
    changePassword:   'تغيير كلمة المرور',
    logout:           'تسجيل الخروج',
    language:         'English',

    // ── Login ──
    welcomeBack:      'مرحباً بعودتك',
    signInDesc:       'سجّل دخولك للوصول إلى لوحتك',
    username:         'اسم المستخدم',
    password:         'كلمة المرور',
    enterUsername:    'أدخل اسم المستخدم',
    enterPassword:    'أدخل كلمة المرور',
    signIn:           'تسجيل الدخول',
    authenticating:   'جارٍ التحقق...',
    copyright:        '© جامعة العرب للعلوم والتكنولوجيا الطبية',
    invalidCreds:     'اسم المستخدم أو كلمة المرور غير صحيحة.',
    accountNotLinked: 'الحساب غير مرتبط بملف شخصي. يرجى التواصل مع الإدارة.',

    // ── Professor ──
    professorDashboard: 'لوحة الأستاذ',
    welcomeProfessor:   'أهلاً بعودتك',
    yourCourses:        'موادك الدراسية',
    refresh:            'تحديث',
    noCoursesAssigned:  'لا توجد مواد مسندة لك هذا الفصل.',
    contactAdminCourse: 'تواصل مع المشرف لإسناد مادة.',
    courseSemester:     (n) => `${n} ${n === 1 ? 'مادة' : 'مواد'} هذا الفصل`,
    cachedData:         'تعذّر التحديث — يعرض بيانات مخزّنة.',

    // ── Student ──
    studentPortal:      'بوابة الطالب',
    welcomeStudent:     'أهلاً',
    myEnrolledCourses:  'موادي المسجّلة',
    notEnrolled:        'أنت غير مسجّل في أي مادة هذا الفصل.',
    contactAdminEnroll: 'تواصل مع المشرف لتسجيلك.',
    coursesEnrolled:    (n) => `${n} مادة مسجّلة.`,
    scanInfo:           'اضغط "مسح الحضور" في أي بطاقة عندما يفتح أستاذك جلسة.',
    scanAttendance:     'مسح الحضور',
    recordingAttendance:'جارٍ تسجيل الحضور…',

    // ── Scan result ──
    attendanceRecorded: 'تم تسجيل الحضور!',
    scanFailed:         'فشل المسح',
    close:              'إغلاق',

    // ── Device mismatch ──
    deviceNotRecognised:'الجهاز غير معروف',
    deviceBody:         'رُفض حضورك لأن مسح QR تم من جهاز غير مسجّل.',
    whatToDo:           'ماذا تفعل:',
    deviceInstructions: 'تواصل مع أستاذك أو المشرف واطلب منهم إعادة تعيين بصمة جهازك. بعد الإعادة ستتمكن من المسح من هذا الجهاز.',
    understood:         'حسناً، فهمت',

    // ── Manual modal ──
    enterQrToken:  'إدخال رمز QR',
    qrTokenCode:   'رمز QR',
    pasteToken:    'الصق أو اكتب الرمز…',
    submitAtt:     'تسجيل الحضور',
    submitting:    'جارٍ الإرسال…',

    // ── Admin ──
    adminDashboard:  'لوحة الإدارة',
    adminDesc:       'إدارة المستخدمين والمواد والتكليفات والتسجيلات.',
    search:          'بحث',
    addNew:          'إضافة جديد',
    refresh2:        'تحديث',
    smartAssign:     'تعيين ذكي',
    actions:         'إجراءات',
    delete:          'حذف',
    export:          'تصدير',
    assign:          'تعيين',
    selected:        (n) => `${n} محدد`,
    deleteRecord:    'هل تريد حذف هذا السجل؟',
    noData:          'لا توجد بيانات.',
    tryAdjusting:    'حاول تعديل بحثك أو مرشّحاتك.',
    clearFilters:    'مسح المرشّحات',
    showHeatmap:     'عرض خريطة الحضور الحرارية',
    hideHeatmap:     'إخفاء خريطة الحضور الحرارية',

    // ── Tabs ──
    students:     'الطلاب',
    professors:   'الأساتذة',
    courses:      'المواد',
    assignments:  'التكليفات',
    enrollments:  'التسجيلات',
    semesters:    'الفصول الدراسية',
    departments:  'الأقسام',
    majors:       'التخصصات',

    // ── Stats ──
    statStudents:    'الطلاب',
    statProfessors:  'الأساتذة',
    statCourses:     'المواد',
    statEnrollments: 'التسجيلات',

    // ── Table columns ──
    colID:          'المعرّف',
    colUsername:    'اسم المستخدم',
    colName:        'الاسم',
    colDepartment:  'القسم',
    colMajor:       'التخصص',
    colYear:        'السنة',
    colCode:        'الرمز',
    colStudyYear:   'سنة الدراسة',
    colProfessors:  'الأساتذة',
    colProfessor:   'الأستاذ',
    colCourseCode:  'رمز المادة',
    colCourseName:  'اسم المادة',
    colSemester:    'الفصل',
    colStudent:     'الطالب',
    colCourse:      'المادة',
    colStartDate:   'تاريخ البداية',
    colEndDate:     'تاريخ النهاية',
    colTotalLec:    'إجمالي المحاضرات',
    colActive:      'نشط',
    colActions:     'الإجراءات',
    yes:            'نعم',
    no:             'لا',

    // ── Change Password ──
    changePasswordTitle: 'تغيير كلمة المرور',
    currentPassword:     'كلمة المرور الحالية',
    newPassword:         'كلمة المرور الجديدة',
    confirmNewPassword:  'تأكيد كلمة المرور الجديدة',
    passwordUpdated:     'تم تحديث كلمة المرور!',
    passwordSuccess:     'تم تغيير كلمة المرور بنجاح.',
    updatePassword:      'تحديث كلمة المرور',
    saving:              'جارٍ الحفظ...',
    passwordMismatch:    'كلمتا المرور الجديدتان غير متطابقتين.',

    // ── Majors Manager ──
    majorsManager:  'إدارة التخصصات',
    majorsDesc:     'عرض وإضافة وحذف التخصصات بأمان.',
    selectDept:     '١. اختر القسم',
    addDepartment:  'إضافة قسم',
    addMajor:       'إضافة تخصص',
    editMajor:      'تعديل التخصص',
    deleteMajor:    'حذف التخصص',
    manageMajor:    'إدارة التخصص',
    majorName:      'اسم التخصص',
    confirmDeleteMajor: 'هل تريد حذف هذا التخصص؟ سيؤثر ذلك على الطلاب المسجّلين به.',
    majorAdded:     'تمت إضافة التخصص بنجاح!',
    majorUpdated:   'تم تحديث التخصص بنجاح!',
    majorDeleted:   'تم حذف التخصص بنجاح!',
    noMajors:       'لا توجد تخصصات. انقر على "إضافة تخصص" لإنشاء واحد.',
    filterByDept:   'تصفية حسب القسم',
    selectPage:     '— اختر —',
    pagePrev:       'السابق →',
    pageNext:       '← التالي',
    showingPage:    'عرض الصفحة',
    of:             'من',
    studentsTotal:  'طالب إجمالاً',

    // ── Breadcrumb ──
    breadcrumbDashboard: 'لوحة التحكم',

    // ── Roles ──
    roleAdmin:     'مشرف',
    roleProfessor: 'أستاذ',
    roleStudent:   'طالب',

    // ── Cascade Filters ──
    filters:        'المرشّحات',
    allDepartments: 'جميع الأقسام',
    allYears:       'جميع السنوات',
    allProfessors:  'جميع الأساتذة',
    allMajors:      'جميع التخصصات',
    clearAll:       'مسح الكل',

    // ── Admin Report ──
    adminReport:         'تقرير الحضور للإدارة',
    adminReportDesc:     'اختر أستاذاً ومادة لعرض وتصدير تقرير الحضور',
    filterProfCourse:    'تصفية حسب الأستاذ والمادة',
    selectProfessor:     '١ · اختر الأستاذ',
    selectCourse:        '٢ · اختر المادة',
    chooseProfessor:     '— اختر أستاذاً —',
    chooseCourse:        '— اختر مادة —',
    searchStudents:      'بحث عن طالب',
    nameOrId:            'الاسم أو الرقم…',
    loadReport:          'تحميل التقرير',
    loading:             'جارٍ التحميل…',
    exportCsv:           'تصدير CSV',
    reportFor:           'تقرير لـ',
    sessionsHeld:        'الجلسات المنعقدة',
    lectureQuota:        'حصة المحاضرات',
    instructorHours:     'ساعات المحاضر',
    studentsLabel:       'الطلاب',
    noStudentsMatch:     'لا يوجد طالب يطابق بحثك.',
    showingOf:           (f, t) => `عرض ${f} من ${t} طالب — انقر على صف لتوسيع تفاصيل المحاضرات ↓`,
    lectureGrid:         (held, quota) => `شبكة حضور المحاضرات (${held} منعقدة / ${quota} الحصة الإجمالية)`,
    noCourses:           'لا توجد مواد لهذا الأستاذ في الفصل الحالي.',
    selectCoursePrompt:  'اختر مادة الآن لإنشاء تقرير الحضور.',
    startByProf:         'ابدأ باختيار أستاذ من القائمة أعلاه.',
    resetDevice:         'إعادة تعيين الجهاز',
    present:             'حاضر',
    absent:              'غائب',
    rate:                'النسبة',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────
const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(
    () => localStorage.getItem('lang') || 'ar'
  );

  // Apply dir + lang attribute + font on every change
  useEffect(() => {
    const html = document.documentElement;
    if (lang === 'ar') {
      html.setAttribute('dir', 'rtl');
      html.setAttribute('lang', 'ar');
    } else {
      html.setAttribute('dir', 'ltr');
      html.setAttribute('lang', 'en');
    }
    localStorage.setItem('lang', lang);
  }, [lang]);

  const toggleLang = useCallback(() => setLang(l => (l === 'ar' ? 'en' : 'ar')), []);

  /** Shorthand: t('key') → translated string */
  const t = useCallback((key, ...args) => {
    const dict = translations[lang] || translations['en'];
    const val = dict[key];
    if (typeof val === 'function') return val(...args);
    return val ?? translations['en'][key] ?? key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
