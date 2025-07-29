import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import useLocalStorage from './hooks/useLocalStorage';

// --- THEME CONTEXT ---
type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme: Theme = 'light';

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
  }, []);

  const toggleTheme = () => {
    // No-op. Dark mode is removed.
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// --- LANGUAGE CONTEXT ---
type Language = 'en' | 'vi';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['en'], ...args: (string | number)[]) => string;
}

const translations = {
  en: {
    headerTitle: "MemoryCare",
    navHome: "Home",
    navMemoryLog: "Memory Log",
    navPlanner: "Planner",
    navLocation: "Location",
    navMyStory: "My Story",
    navSettings: "Settings",
    footerText: "MemoryCare © {year}",
    language: "Language",
    welcomeTitle: "Welcome to MemoryCare",
    welcomeSubtitle: "Your personal assistant for daily living.",
    welcomeMessage: "This application is designed to help you manage your day, remember important information, and stay connected.",
    featureMemoryLogTitle: "Memory Log",
    featureMemoryLogDesc: "Keep track of loved ones and daily thoughts.",
    featurePlannerTitle: "Activity Planner",
    featurePlannerDesc: "Schedule your daily activities with reminders.",
    featureLocationTitle: "Location Services",
    featureLocationDesc: "Get help with navigation and stay safe.",
    reminderTitle: "A Gentle Reminder",
    reminderText: "Take each day one step at a time. We are here to support you. If you need help, please reach out to a caregiver or family member.",
    pageTitleMemoryLog: "Memory Log",
    pageSubtitleMemoryLog: "Remember important people and record your daily thoughts.",
    personAddedSuccess: "{name} added successfully!",
    personUpdatedSuccess: "{name} updated successfully.",
    personDeletedInfo: "Person deleted.",
    confirmDeletePerson: "Are you sure you want to delete this person?",
    journalSavedSuccess: "Journal entry saved!",
    journalNoSpeechInfo: "No speech detected to save.",
    confirmDeleteJournal: "Are you sure you want to delete this journal entry?",
    journalDeletedInfo: "Journal entry deleted.",
    ttsNotSupportedError: "Text-to-speech is not supported on this device.",
    ttsLanguageUnavailableError: "A native voice for the selected language is not available on your device. Speech functionality is limited.",
    peopleSectionTitle: "People",
    addPersonButton: "Add Person",
    noPeopleYet: 'No people added yet. Click "Add Person" to get started.',
    recallButton: "Recall",
    editButton: "Edit",
    deleteButton: "Delete",
    personRecallSpeech: "This is {name}, who is your {relationship}. {keyInfo}",
    journalSectionTitle: "Daily Journal",
    journalDescription: "Record your thoughts, feelings, or activities for the day using your voice.",
    speechNotSupported: "Speech recognition is not supported in your browser.",
    listeningPlaceholder: "Listening...",
    recordedThoughtsPlaceholder: "Your recorded thoughts will appear here...",
    startRecordingButton: "Start Recording",
    stopRecordingButton: "Stop Recording",
    saveEntryButton: "Save Entry",
    pastEntriesTitle: "Past Entries:",
    readAloudButton: "Read Aloud",
    modalAddPersonTitle: "Add New Person",
    modalEditPersonTitle: "Edit {name}",
    formNameLabel: "Name",
    formRelationshipLabel: "Relationship",
    formPhotoUrlLabel: "Photo URL (e.g., https://i.pravatar.cc/150)",
    formKeyInfoLabel: "Key Information",
    formCancelButton: "Cancel",
    formAddButton: "Add Person",
    formUpdateButton: "Update Person",
    formRequiredAlert: "Name and relationship are required.",
    pageTitlePlanner: "Daily Activity Planner",
    pageSubtitlePlanner: "Schedule your activities and get timely reminders.",
    activityAddedSuccess: 'Activity "{name}" added.',
    activityUpdatedSuccess: 'Activity "{name}" updated.',
    activityDeletedInfo: "Activity deleted.",
    confirmDeleteActivity: "Are you sure you want to delete this activity?",
    remindSentInfo: 'Reminder for "{name}" sent.',
    ttsAlertMessage: "Text-to-speech not supported. Showing alert instead.",
    activityReminderSpeech: "Reminder: It's time for {name} at {time}. {description}",
    addActivityButton: "Add Activity",
    noActivitiesYet: 'No activities scheduled. Click "Add Activity" to plan your day.',
    remindButton: "Remind",
    modalAddActivityTitle: "Add New Activity",
    modalEditActivityTitle: "Edit Activity",
    formActivityNameLabel: "Activity Name",
    formTimeLabel: "Time (HH:MM)",
    formDescriptionLabel: "Description (Optional)",
    formRecurringLabel: "Recurring Activity",
    formAddActivityButton: "Add Activity",
    formUpdateActivityButton: "Update Activity",
    formTimeRequiredAlert: "Activity name and time are required.",
    pageTitleLocation: "Location Services",
    pageSubtitleLocation: "Use the interactive map to find your way.",
    locationRefreshedSuccess: "Current location updated.",
    locationError: "Error getting location: {message}",
    homeSetSuccess: "Home location saved!",
    homeSetSpeech: "Home location has been set.",
    homeSetError: "Could not set home location. Current location unknown.",
    guideHomeError: "Cannot guide home, current location unknown. Try refreshing location.",
    guideHomeNotSetInfo: "Home location is not set. Please set it first.",
    destinationMissingInfo: "Please enter a destination.",
    notifyFamilySuccess: "Simulated: Notifying your family at {emails} that you are leaving.",
    notifyFamilyNoEmails: "No family emails found. Please add contacts in Family Settings to send notifications.",
    currentLocationTitle: "Current Location",
    findingLocation: "Finding your location...",
    latitude: "Latitude",
    longitude: "Longitude",
    refreshLocationButton: "Refresh Location",
    homeSettingsTitle: "Home Settings",
    homeSetLocationInfo: "Home is set to: Lat {lat}, Lon {lon}",
    homeNotSetInfo: 'Home location not set. Go to your home and click "Set Current Location as Home".',
    setHomeButton: "Set Current Location as Home",
    saveLocationButton: "Save This Spot",
    modalSaveLocationTitle: "Save Current Location",
    modalEditLocationTitle: "Edit Location Name",
    formLocationNameLabel: "Location Name",
    formLocationNamePlaceholder: "e.g., Park Entrance, Library",
    formSaveLocationButton: "Save Location",
    formUpdateLocationButton: "Update Name",
    locationNameRequired: "Location name is required.",
    locationSavedSuccess: 'Location "{name}" saved successfully.',
    savedLocationUpdatedSuccess: 'Location "{name}" updated successfully.',
    locationDeletedInfo: "Saved location has been deleted.",
    confirmDeleteLocation: 'Are you sure you want to delete the saved location "{name}"?',
    savedPlacesSectionTitle: "My Saved Places",
    noSavedPlaces: "You haven't saved any places yet. Use the 'Save This Spot' button to add one.",
    guideHereButton: "Guide Me Here",
    navigationHelpTitle: "Route Planner",
    guideHomeButton: "Guide Me Home",
    destinationLabel: "Where do you want to go?",
    destinationPlaceholder: "e.g., Post Office, Doctor's Clinic",
    guideToDestinationButton: "Guide to Destination",
    gettingDirections: "Calculating route...",
    directionsTitle: "Route Steps:",
    readDirectionsButton: "Read Directions",
    safetyActionsTitle: "Safety Actions",
    notifyFamilyButton: "Notify Family",
    notifyFamilyEmailSubject: "Location Update from MemoryCare",
    notifyFamilyEmailBody: "I am sharing my current location.\nLatitude: {lat}\nLongitude: {lon}\n\nView on Google Maps: https://www.google.com/maps?q={lat},{lon}",
    mapError: "Could not load the map. Please check your connection and try again.",
    mapApiKeyError: "Goong API key (GOONG_API_KEY) is not configured. This is different from the Gemini key.",
    geocodeError: "Could not find the location '{destination}'. Please try a different name or address.",
    directionsError: "Could not calculate a route. The destination may be unreachable.",
    pageTitleSettings: "Settings",
    pageSubtitleSettings: "Manage general settings, contacts, and application data.",
    addFamilyEmailButton: "Add Email",
    familyEmailInputPlaceholder: "Family member's email",
    noFamilyEmails: "No family members have been added yet.",
    familyEmailAddedSuccess: "{email} has been added to your family list.",
    familyEmailExistsError: "{email} is already in the list.",
    familyEmailInvalidError: "Please enter a valid email address.",
    familyEmailDeletedInfo: "{email} has been removed from the list.",
    confirmDeleteEmail: "Are you sure you want to remove {email}?",
    sharePlanButton: "Share Plan",
    sharePlanSuccess: "Simulated: Today's plan has been sent to {emails}.",
    sharePlanNoEmails: "No family emails found. Please add contacts in Family Settings to share your plan.",
    sharePlanEmailSubject: "Daily Plan from MemoryCare",
    sharePlanEmailBodyHeader: "Here is the schedule for today:\n\n",
    familyContactsSectionTitle: "Family Contacts",
    dataManagementTitle: "Data Management",
    dataManagementSubtitle: "Backup your data to a file or restore it from a backup.",
    exportDataButton: "Export Data",
    importDataButton: "Import Data",
    importConfirmTitle: "Confirm Import",
    importConfirmMessage: "Choose how to import the data. 'Merge' will add new items and update existing ones from the file. 'Overwrite' will delete all current data and replace it with the backup.",
    mergeDataButton: "Merge Data",
    overwriteDataButton: "Overwrite All Data",
    importSuccessMerge: "Data merged successfully! The app will now reload.",
    importSuccessOverwrite: "Data overwritten successfully! The app will now reload.",
    importErrorInvalidFile: "Import failed. The selected file is not a valid MemoryCare backup file.",
    importErrorReadFile: "Import failed. Could not read the selected file.",
    aiWelcomeMessage: "Hello! I'm your friendly assistant. How can I help you remember something today?",
    aiPlaceholder: "Ask me a question...",
    pageTitleMyStory: "My Story",
    pageSubtitleMyStory: "A living story of your life, updated with each memory you share.",
    myStoryAIQuestionTitle: "A Question for Today",
    myStoryYourAnswerTitle: "Your Answer",
    myStoryAnswerPlaceholder: "Share your thoughts and memories here...",
    myStorySaveAndUpdateButton: "Update My Story",
    myStoryTitle: "My Life Story",
    myStoryInitialStory: "Your story will be written here as you answer the questions. Let's begin by answering the first question.",
    myStoryLoadingStory: "Weaving your memories into a beautiful story...",
    myStoryLoadingQuestion: "Thinking of a new question for you...",
    myStoryMicrophoneButtonStart: "Record Answer",
    myStoryMicrophoneButtonStop: "Stop Recording",
  },
  vi: {
    headerTitle: "MemoryCare",
    navHome: "Trang Chủ",
    navMemoryLog: "Nhật Ký",
    navPlanner: "Kế Hoạch",
    navLocation: "Vị Trí",
    navMyStory: "Câu Chuyện Của Tôi",
    navSettings: "Cài Đặt",
    footerText: "MemoryCare © {year}",
    language: "Ngôn ngữ",
    welcomeTitle: "Chào mừng đến với MemoryCare",
    welcomeSubtitle: "Trợ lý cá nhân cho cuộc sống hàng ngày của bạn.",
    welcomeMessage: "Ứng dụng này được thiết kế để giúp bạn quản lý ngày của mình, ghi nhớ thông tin quan trọng và luôn kết nối.",
    featureMemoryLogTitle: "Nhật Ký",
    featureMemoryLogDesc: "Theo dõi những người thân yêu và những suy nghĩ hàng ngày.",
    featurePlannerTitle: "Kế Hoạch Hoạt Động",
    featurePlannerDesc: "Lên lịch các hoạt động hàng ngày của bạn với lời nhắc.",
    featureLocationTitle: "Dịch Vụ Vị Trí",
    featureLocationDesc: "Nhận trợ giúp về điều hướng và giữ an toàn.",
    reminderTitle: "Một Lời Nhắc Nhẹ Nhàng",
    reminderText: "Hãy thực hiện mỗi ngày từng bước một. Chúng tôi ở đây để hỗ trợ bạn. Nếu bạn cần giúp đỡ, vui lòng liên hệ với người chăm sóc hoặc thành viên gia đình.",
    pageTitleMemoryLog: "Nhật Ký",
    pageSubtitleMemoryLog: "Ghi nhớ những người quan trọng và ghi lại những suy nghĩ hàng ngày của bạn.",
    personAddedSuccess: "Đã thêm {name} thành công!",
    personUpdatedSuccess: "Đã cập nhật {name} thành công.",
    personDeletedInfo: "Đã xóa người.",
    confirmDeletePerson: "Bạn có chắc muốn xóa người này không?",
    journalSavedSuccess: "Đã lưu bút ký!",
    journalNoSpeechInfo: "Không phát hiện giọng nói để lưu.",
    confirmDeleteJournal: "Bạn có chắc muốn xóa mục nhật ký này không?",
    journalDeletedInfo: "Đã xóa mục nhật ký.",
    ttsNotSupportedError: "Chuyển văn bản thành giọng nói không được hỗ trợ trên thiết bị này.",
    ttsLanguageUnavailableError: "Thiết bị của bạn không có sẵn giọng nói bản địa cho ngôn ngữ đã chọn. Chức năng giọng nói bị hạn chế.",
    peopleSectionTitle: "Mọi người",
    addPersonButton: "Thêm Người",
    noPeopleYet: 'Chưa có ai được thêm. Nhấp vào "Thêm Người" để bắt đầu.',
    recallButton: "Gợi Nhớ",
    editButton: "Sửa",
    deleteButton: "Xóa",
    personRecallSpeech: "Đây là {name}, là {relationship} của bạn. {keyInfo}",
    journalSectionTitle: "Nhật Ký Hàng Ngày",
    journalDescription: "Ghi lại suy nghĩ, cảm xúc hoặc hoạt động trong ngày bằng giọng nói của bạn.",
    speechNotSupported: "Nhận dạng giọng nói không được hỗ trợ trong trình duyệt của bạn.",
    listeningPlaceholder: "Đang nghe...",
    recordedThoughtsPlaceholder: "Những suy nghĩ đã ghi của bạn sẽ xuất hiện ở đây...",
    startRecordingButton: "Bắt đầu ghi âm",
    stopRecordingButton: "Dừng ghi âm",
    saveEntryButton: "Lưu Mục",
    pastEntriesTitle: "Các mục trước đây:",
    readAloudButton: "Đọc To",
    modalAddPersonTitle: "Thêm Người Mới",
    modalEditPersonTitle: "Sửa thông tin {name}",
    formNameLabel: "Tên",
    formRelationshipLabel: "Mối quan hệ",
    formPhotoUrlLabel: "URL Ảnh (ví dụ: https://i.pravatar.cc/150)",
    formKeyInfoLabel: "Thông Tin Chính",
    formCancelButton: "Hủy",
    formAddButton: "Thêm Người",
    formUpdateButton: "Cập nhật",
    formRequiredAlert: "Tên và mối quan hệ là bắt buộc.",
    pageTitlePlanner: "Kế Hoạch Hoạt Động Hàng Ngày",
    pageSubtitlePlanner: "Lên lịch các hoạt động và nhận lời nhắc kịp thời.",
    activityAddedSuccess: 'Đã thêm hoạt động "{name}".',
    activityUpdatedSuccess: 'Đã cập nhật hoạt động "{name}".',
    activityDeletedInfo: "Đã xóa hoạt động.",
    confirmDeleteActivity: "Bạn có chắc muốn xóa hoạt động này không?",
    remindSentInfo: 'Đã gửi lời nhắc cho "{name}".',
    ttsAlertMessage: "Chuyển văn bản thành giọng nói không được hỗ trợ. Thay vào đó hiển thị cảnh báo.",
    activityReminderSpeech: "Nhắc nhở: Đã đến giờ cho {name} lúc {time}. {description}",
    addActivityButton: "Thêm Hoạt Động",
    noActivitiesYet: 'Chưa có hoạt động nào được lên lịch. Nhấp vào "Thêm Hoạt Động" để lên kế hoạch cho ngày của bạn.',
    remindButton: "Nhắc nhở",
    modalAddActivityTitle: "Thêm Hoạt Động Mới",
    modalEditActivityTitle: "Sửa Hoạt Động",
    formActivityNameLabel: "Tên Hoạt Động",
    formTimeLabel: "Thời gian (HH:MM)",
    formDescriptionLabel: "Mô tả (Tùy chọn)",
    formRecurringLabel: "Hoạt động lặp lại",
    formAddActivityButton: "Thêm Hoạt Động",
    formUpdateActivityButton: "Cập Nhật Hoạt Động",
    formTimeRequiredAlert: "Tên hoạt động và thời gian là bắt buộc.",
    pageTitleLocation: "Dịch Vụ Vị Trí",
    pageSubtitleLocation: "Sử dụng bản đồ tương tác để tìm đường.",
    locationRefreshedSuccess: "Đã cập nhật vị trí hiện tại.",
    locationError: "Lỗi khi lấy vị trí: {message}",
    homeSetSuccess: "Đã lưu vị trí nhà!",
    homeSetSpeech: "Vị trí nhà đã được thiết lập.",
    homeSetError: "Không thể đặt vị trí nhà. Không rõ vị trí hiện tại.",
    guideHomeError: "Không thể chỉ đường về nhà, không rõ vị trí hiện tại. Hãy thử làm mới vị trí.",
    guideHomeNotSetInfo: "Vị trí nhà chưa được đặt. Vui lòng đặt trước.",
    destinationMissingInfo: "Vui lòng nhập điểm đến.",
    notifyFamilySuccess: "Mô phỏng: Đang thông báo cho gia đình bạn tại {emails} rằng bạn sắp rời đi.",
    notifyFamilyNoEmails: "Không tìm thấy email gia đình. Vui lòng thêm liên hệ trong Cài Đặt Gia Đình để gửi thông báo.",
    currentLocationTitle: "Vị trí hiện tại",
    findingLocation: "Đang tìm vị trí của bạn...",
    latitude: "Vĩ độ",
    longitude: "Kinh độ",
    refreshLocationButton: "Làm mới vị trí",
    homeSettingsTitle: "Cài đặt nhà",
    homeSetLocationInfo: "Nhà được đặt tại: Vĩ độ {lat}, Kinh độ {lon}",
    homeNotSetInfo: 'Vị trí nhà chưa được đặt. Hãy về nhà và nhấp vào "Đặt vị trí hiện tại làm nhà".',
    setHomeButton: "Đặt vị trí hiện tại làm nhà",
    saveLocationButton: "Lưu điểm này",
    modalSaveLocationTitle: "Lưu Vị Trí Hiện Tại",
    modalEditLocationTitle: "Sửa Tên Vị Trí",
    formLocationNameLabel: "Tên vị trí",
    formLocationNamePlaceholder: "ví dụ: Lối vào công viên, Thư viện",
    formSaveLocationButton: "Lưu Vị Trí",
    formUpdateLocationButton: "Cập Nhật Tên",
    locationNameRequired: "Tên vị trí là bắt buộc.",
    locationSavedSuccess: 'Đã lưu vị trí "{name}" thành công.',
    savedLocationUpdatedSuccess: 'Đã cập nhật vị trí "{name}" thành công.',
    locationDeletedInfo: "Đã xóa vị trí đã lưu.",
    confirmDeleteLocation: 'Bạn có chắc muốn xóa vị trí đã lưu "{name}" không?',
    savedPlacesSectionTitle: "Địa Điểm Đã Lưu",
    noSavedPlaces: "Bạn chưa lưu địa điểm nào. Sử dụng nút 'Lưu điểm này' để thêm một địa điểm.",
    guideHereButton: "Chỉ đường đến đây",
    navigationHelpTitle: "Lên Kế Hoạch Lộ Trình",
    guideHomeButton: "Chỉ đường về nhà",
    destinationLabel: "Bạn muốn đi đâu?",
    destinationPlaceholder: "ví dụ: Bưu điện, Phòng khám bác sĩ",
    guideToDestinationButton: "Chỉ đường đến đích",
    gettingDirections: "Đang tính toán lộ trình...",
    directionsTitle: "Các bước của lộ trình:",
    readDirectionsButton: "Đọc chỉ đường",
    safetyActionsTitle: "Hành động an toàn",
    notifyFamilyButton: "Thông báo cho Gia đình",
    notifyFamilyEmailSubject: "Cập Nhật Vị Trí từ MemoryCare",
    notifyFamilyEmailBody: "Tôi đang chia sẻ vị trí hiện tại của mình.\nVĩ độ: {lat}\nKinh độ: {lon}\n\nXem trên Google Maps: https://www.google.com/maps?q={lat},{lon}",
    mapError: "Không thể tải bản đồ. Vui lòng kiểm tra kết nối và thử lại.",
    mapApiKeyError: "Khóa API Goong (GOONG_API_KEY) chưa được cấu hình. Khóa này khác với khóa Gemini.",
    geocodeError: "Không thể tìm thấy vị trí '{destination}'. Vui lòng thử một tên hoặc địa chỉ khác.",
    directionsError: "Không thể tính toán lộ trình. Điểm đến có thể không thể tiếp cận được.",
    pageTitleSettings: "Cài đặt",
    pageSubtitleSettings: "Quản lý cài đặt chung, danh bạ và dữ liệu ứng dụng.",
    addFamilyEmailButton: "Thêm Email",
    familyEmailInputPlaceholder: "Email của thành viên gia đình",
    noFamilyEmails: "Chưa có thành viên gia đình nào được thêm.",
    familyEmailAddedSuccess: "Đã thêm {email} vào danh sách gia đình của bạn.",
    familyEmailExistsError: "{email} đã có trong danh sách.",
    familyEmailInvalidError: "Vui lòng nhập một địa chỉ email hợp lệ.",
    familyEmailDeletedInfo: "Đã xóa {email} khỏi danh sách.",
    confirmDeleteEmail: "Bạn có chắc muốn xóa {email} không?",
    sharePlanButton: "Chia Sẻ Kế Hoạch",
    sharePlanSuccess: "Mô phỏng: Kế hoạch hôm nay đã được gửi đến {emails}.",
    sharePlanNoEmails: "Không tìm thấy email gia đình. Vui lòng thêm liên hệ trong Cài Đặt Gia Đình để chia sẻ kế hoạch của bạn.",
    sharePlanEmailSubject: "Kế Hoạch Hàng Ngày từ MemoryCare",
    sharePlanEmailBodyHeader: "Đây là lịch trình cho ngày hôm nay:\n\n",
    familyContactsSectionTitle: "Danh bạ Gia đình",
    dataManagementTitle: "Quản lý Dữ liệu",
    dataManagementSubtitle: "Sao lưu dữ liệu của bạn ra tệp hoặc khôi phục từ bản sao lưu.",
    exportDataButton: "Xuất Dữ liệu",
    importDataButton: "Nhập Dữ liệu",
    importConfirmTitle: "Xác nhận Nhập",
    importConfirmMessage: "Chọn cách nhập dữ liệu. 'Hợp nhất' sẽ thêm các mục mới và cập nhật các mục hiện có từ tệp. 'Ghi đè' sẽ xóa tất cả dữ liệu hiện tại và thay thế bằng bản sao lưu.",
    mergeDataButton: "Hợp nhất Dữ liệu",
    overwriteDataButton: "Ghi đè Tất cả Dữ liệu",
    importSuccessMerge: "Hợp nhất dữ liệu thành công! Ứng dụng sẽ tải lại ngay bây giờ.",
    importSuccessOverwrite: "Ghi đè dữ liệu thành công! Ứng dụng sẽ tải lại ngay bây giờ.",
    importErrorInvalidFile: "Nhập thất bại. Tệp đã chọn không phải là tệp sao lưu MemoryCare hợp lệ.",
    importErrorReadFile: "Nhập thất bại. Không thể đọc tệp đã chọn.",
    aiWelcomeMessage: "Xin chào! Tôi là trợ lý thân thiện của bạn. Hôm nay tôi có thể giúp bạn nhớ điều gì?",
    aiPlaceholder: "Hỏi tôi một câu hỏi...",
    pageTitleMyStory: "Câu Chuyện Của Tôi",
    pageSubtitleMyStory: "Một câu chuyện sống động về cuộc đời bạn, được cập nhật với mỗi ký ức bạn chia sẻ.",
    myStoryAIQuestionTitle: "Câu Hỏi Cho Hôm Nay",
    myStoryYourAnswerTitle: "Câu Trả Lời Của Bạn",
    myStoryAnswerPlaceholder: "Chia sẻ suy nghĩ và ký ức của bạn ở đây...",
    myStorySaveAndUpdateButton: "Cập Nhật Câu Chuyện",
    myStoryTitle: "Câu Chuyện Cuộc Đời Tôi",
    myStoryInitialStory: "Câu chuyện của bạn sẽ được viết ở đây khi bạn trả lời các câu hỏi. Hãy bắt đầu bằng cách trả lời câu hỏi đầu tiên.",
    myStoryLoadingStory: "Đang dệt nên câu chuyện tuyệt đẹp từ ký ức của bạn...",
    myStoryLoadingQuestion: "Đang nghĩ một câu hỏi mới cho bạn...",
    myStoryMicrophoneButtonStart: "Ghi Âm Câu Trả Lời",
    myStoryMicrophoneButtonStop: "Dừng Ghi Âm",
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useLocalStorage<Language>('language', 'vi');

  const t = useCallback((key: keyof typeof translations['en'], ...args: (string | number)[]) => {
    let translation = translations[language]?.[key] || translations['en'][key];
    
    // Sequentially replace placeholders to avoid issues with global regex state
    args.forEach(arg => {
        translation = translation.replace(/\{[^{}]+\}/, String(arg));
    });

    return translation;
  }, [language]);


  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
