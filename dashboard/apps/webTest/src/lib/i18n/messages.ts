import type { Language } from "./config";

export type TranslationKey =
  | "common.language"
  | "language.english"
  | "language.turkish"
  | "language.russian"
  | "language.azerbaijani"
  | "sidebar.quickCreate"
  | "sidebar.inbox"
  | "sidebar.soon"
  | "sidebar.group.dashboards"
  | "sidebar.group.pages"
  | "sidebar.group.misc"
  | "sidebar.group.user"
  | "sidebar.group.admin"
  | "sidebar.group.legacy"
  | "sidebar.group.system"
  | "sidebar.item.default"
  | "sidebar.item.crm"
  | "sidebar.item.finance"
  | "sidebar.item.analytics"
  | "sidebar.item.users"
  | "sidebar.item.ecommerce"
  | "sidebar.item.authentication"
  | "sidebar.item.loginV1"
  | "sidebar.item.loginV2"
  | "sidebar.item.registerV1"
  | "sidebar.item.registerV2"
  | "sidebar.item.profile"
  | "sidebar.item.others"
  | "sidebar.item.overview"
  | "sidebar.item.mint"
  | "sidebar.item.redeem"
  | "sidebar.item.kyb"
  | "sidebar.item.reserveTransparency"
  | "sidebar.item.wallet"
  | "sidebar.item.banking"
  | "sidebar.item.settings"
  | "sidebar.item.adminOverview"
  | "sidebar.item.mintOps"
  | "sidebar.item.redemptionOps"
  | "sidebar.item.kybReview"
  | "sidebar.item.treasury"
  | "sidebar.item.riskControls"
  | "sidebar.item.blacklist"
  | "sidebar.item.contractControls"
  | "sidebar.item.unauthorized"
  | "user.account"
  | "user.billing"
  | "user.notifications"
  | "user.logOut"
  | "user.loggingOut"
  | "user.logoutFailed"
  | "auth.login"
  | "auth.register"
  | "auth.emailAddress"
  | "auth.password"
  | "auth.confirmPassword"
  | "auth.fullName"
  | "auth.rememberMe30Days"
  | "auth.pleaseWait"
  | "auth.loginSuccess"
  | "auth.registerSuccess"
  | "auth.loginFailed"
  | "auth.registerFailed"
  | "auth.helloAgain"
  | "auth.loginToContinue"
  | "auth.welcomeBackMessage"
  | "auth.registerIntro"
  | "auth.dontHaveAccount"
  | "auth.alreadyHaveAccount"
  | "auth.welcome"
  | "auth.rightPlace"
  | "auth.loginToAccount"
  | "auth.createAccount"
  | "auth.enterDetailsToLogin"
  | "auth.enterDetailsToRegister"
  | "auth.orContinueWith"
  | "auth.continueWithGoogle"
  | "auth.v2.tagline"
  | "auth.v2.readyToLaunchTitle"
  | "auth.v2.readyToLaunchDesc"
  | "auth.v2.needHelpTitle"
  | "auth.v2.needHelpDesc";

type MessageMap = Record<TranslationKey, string>;

export const messages: Record<Language, MessageMap> = {
  en: {
    "common.language": "Language",
    "language.english": "English",
    "language.turkish": "Turkish",
    "language.russian": "Russian",
    "language.azerbaijani": "Azerbaijani",

    "sidebar.quickCreate": "Quick Create",
    "sidebar.inbox": "Inbox",
    "sidebar.soon": "Soon",
    "sidebar.group.dashboards": "Dashboards",
    "sidebar.group.pages": "Pages",
    "sidebar.group.misc": "Misc",
    "sidebar.group.user": "User",
    "sidebar.group.admin": "Admin",
    "sidebar.group.legacy": "Legacy",
    "sidebar.group.system": "System",
    "sidebar.item.default": "Default",
    "sidebar.item.crm": "CRM",
    "sidebar.item.finance": "Finance",
    "sidebar.item.analytics": "Analytics",
    "sidebar.item.users": "Users",
    "sidebar.item.ecommerce": "E-commerce",
    "sidebar.item.authentication": "Authentication",
    "sidebar.item.loginV1": "Login v1",
    "sidebar.item.loginV2": "Login v2",
    "sidebar.item.registerV1": "Register v1",
    "sidebar.item.registerV2": "Register v2",
    "sidebar.item.profile": "Profile",
    "sidebar.item.others": "Others",
    "sidebar.item.overview": "Overview",
    "sidebar.item.mint": "Mint",
    "sidebar.item.redeem": "Redeem",
    "sidebar.item.kyb": "KYB",
    "sidebar.item.reserveTransparency": "Reserve Transparency",
    "sidebar.item.wallet": "Wallet",
    "sidebar.item.banking": "Banking",
    "sidebar.item.settings": "Settings",
    "sidebar.item.adminOverview": "Admin Overview",
    "sidebar.item.mintOps": "Mint Ops",
    "sidebar.item.redemptionOps": "Redemption Ops",
    "sidebar.item.kybReview": "Institution Management",
    "sidebar.item.treasury": "Reserve Management",
    "sidebar.item.riskControls": "Wallet",
    "sidebar.item.blacklist": "Admin & Role Management",
    "sidebar.item.contractControls": "Settings",
    "sidebar.item.unauthorized": "Unauthorized",

    "user.account": "Account",
    "user.billing": "Billing",
    "user.notifications": "Notifications",
    "user.logOut": "Log out",
    "user.loggingOut": "Logging out...",
    "user.logoutFailed": "Logout failed",

    "auth.login": "Login",
    "auth.register": "Register",
    "auth.emailAddress": "Email Address",
    "auth.password": "Password",
    "auth.confirmPassword": "Confirm Password",
    "auth.fullName": "Full Name",
    "auth.rememberMe30Days": "Remember me for 30 days",
    "auth.pleaseWait": "Please wait...",
    "auth.loginSuccess": "Logged in successfully",
    "auth.registerSuccess": "Registered successfully",
    "auth.loginFailed": "Login failed",
    "auth.registerFailed": "Registration failed",
    "auth.helloAgain": "Hello again",
    "auth.loginToContinue": "Login to continue",
    "auth.welcomeBackMessage": "Welcome back. Enter your email and password.",
    "auth.registerIntro": "Fill in your details below to create your account.",
    "auth.dontHaveAccount": "Don't have an account?",
    "auth.alreadyHaveAccount": "Already have an account?",
    "auth.welcome": "Welcome!",
    "auth.rightPlace": "You're in the right place.",
    "auth.loginToAccount": "Login to your account",
    "auth.createAccount": "Create your account",
    "auth.enterDetailsToLogin": "Please enter your details to login.",
    "auth.enterDetailsToRegister": "Please enter your details to register.",
    "auth.orContinueWith": "Or continue with",
    "auth.continueWithGoogle": "Continue with Google",
    "auth.v2.tagline": "Design. Build. Launch. Repeat.",
    "auth.v2.readyToLaunchTitle": "Ready to launch?",
    "auth.v2.readyToLaunchDesc":
      "Clone the repo, install dependencies, and your dashboard is live in minutes.",
    "auth.v2.needHelpTitle": "Need help?",
    "auth.v2.needHelpDesc":
      "Check out the docs or open an issue on GitHub, community support is a click away.",
  },
  tr: {
    "common.language": "Dil",
    "language.english": "İngilizce",
    "language.turkish": "Türkçe",
    "language.russian": "Rusça",
    "language.azerbaijani": "Azerbaycanca",

    "sidebar.quickCreate": "Hızlı Oluştur",
    "sidebar.inbox": "Gelen Kutusu",
    "sidebar.soon": "Yakında",
    "sidebar.group.dashboards": "Panolar",
    "sidebar.group.pages": "Sayfalar",
    "sidebar.group.misc": "Diğer",
    "sidebar.group.user": "Kullanıcı",
    "sidebar.group.admin": "Yönetici",
    "sidebar.group.legacy": "Eski",
    "sidebar.group.system": "Sistem",
    "sidebar.item.default": "Varsayılan",
    "sidebar.item.crm": "CRM",
    "sidebar.item.finance": "Finans",
    "sidebar.item.analytics": "Analitik",
    "sidebar.item.users": "Kullanıcılar",
    "sidebar.item.ecommerce": "E-ticaret",
    "sidebar.item.authentication": "Kimlik Doğrulama",
    "sidebar.item.loginV1": "Giriş v1",
    "sidebar.item.loginV2": "Giriş v2",
    "sidebar.item.registerV1": "Kayıt v1",
    "sidebar.item.registerV2": "Kayıt v2",
    "sidebar.item.profile": "Profil",
    "sidebar.item.others": "Diğerleri",
    "sidebar.item.overview": "Genel Bakış",
    "sidebar.item.mint": "Mint",
    "sidebar.item.redeem": "Redeem",
    "sidebar.item.kyb": "KYB",
    "sidebar.item.reserveTransparency": "Rezerv Şeffaflığı",
    "sidebar.item.wallet": "Cüzdan",
    "sidebar.item.banking": "Bankacılık",
    "sidebar.item.settings": "Ayarlar",
    "sidebar.item.adminOverview": "Yönetici Genel Bakış",
    "sidebar.item.mintOps": "Mint Ops",
    "sidebar.item.redemptionOps": "Redeem Ops",
    "sidebar.item.kybReview": "Kurum Yönetimi",
    "sidebar.item.treasury": "Rezerv Yönetimi",
    "sidebar.item.riskControls": "Cüzdan",
    "sidebar.item.blacklist": "Yönetici ve Rol Yönetimi",
    "sidebar.item.contractControls": "Ayarlar",
    "sidebar.item.unauthorized": "Yetkisiz",

    "user.account": "Hesap",
    "user.billing": "Faturalandırma",
    "user.notifications": "Bildirimler",
    "user.logOut": "Çıkış yap",
    "user.loggingOut": "Çıkış yapılıyor...",
    "user.logoutFailed": "Çıkış başarısız",

    "auth.login": "Giriş",
    "auth.register": "Kayıt Ol",
    "auth.emailAddress": "E-posta Adresi",
    "auth.password": "Şifre",
    "auth.confirmPassword": "Şifreyi Onayla",
    "auth.fullName": "Ad Soyad",
    "auth.rememberMe30Days": "Beni 30 gün hatırla",
    "auth.pleaseWait": "Lütfen bekleyin...",
    "auth.loginSuccess": "Giriş başarılı",
    "auth.registerSuccess": "Kayıt başarılı",
    "auth.loginFailed": "Giriş başarısız",
    "auth.registerFailed": "Kayıt başarısız",
    "auth.helloAgain": "Tekrar merhaba",
    "auth.loginToContinue": "Devam etmek için giriş yap",
    "auth.welcomeBackMessage": "Tekrar hoş geldin. E-posta ve şifreni gir.",
    "auth.registerIntro": "Hesap oluşturmak için bilgilerini gir.",
    "auth.dontHaveAccount": "Hesabın yok mu?",
    "auth.alreadyHaveAccount": "Zaten hesabın var mı?",
    "auth.welcome": "Hoş geldin!",
    "auth.rightPlace": "Doğru yerdesin.",
    "auth.loginToAccount": "Hesabına giriş yap",
    "auth.createAccount": "Hesabını oluştur",
    "auth.enterDetailsToLogin": "Lütfen giriş yapmak için bilgilerini gir.",
    "auth.enterDetailsToRegister": "Lütfen kayıt olmak için bilgilerini gir.",
    "auth.orContinueWith": "Veya şununla devam et",
    "auth.continueWithGoogle": "Google ile devam et",
    "auth.v2.tagline": "Tasarla. Geliştir. Yayınla. Tekrarla.",
    "auth.v2.readyToLaunchTitle": "Yayına hazır mısın?",
    "auth.v2.readyToLaunchDesc":
      "Repoyu klonla, bağımlılıkları kur ve panelin dakikalar içinde hazır olsun.",
    "auth.v2.needHelpTitle": "Yardıma mı ihtiyacın var?",
    "auth.v2.needHelpDesc":
      "Dokümantasyona bak veya GitHub'da issue aç, topluluk desteği bir tık uzağında.",
  },
  ru: {
    "common.language": "Язык",
    "language.english": "Английский",
    "language.turkish": "Турецкий",
    "language.russian": "Русский",
    "language.azerbaijani": "Азербайджанский",

    "sidebar.quickCreate": "Быстро создать",
    "sidebar.inbox": "Входящие",
    "sidebar.soon": "Скоро",
    "sidebar.group.dashboards": "Панели",
    "sidebar.group.pages": "Страницы",
    "sidebar.group.misc": "Разное",
    "sidebar.group.user": "Пользователь",
    "sidebar.group.admin": "Админ",
    "sidebar.group.legacy": "Легаси",
    "sidebar.group.system": "Система",
    "sidebar.item.default": "По умолчанию",
    "sidebar.item.crm": "CRM",
    "sidebar.item.finance": "Финансы",
    "sidebar.item.analytics": "Аналитика",
    "sidebar.item.users": "Пользователи",
    "sidebar.item.ecommerce": "Электронная коммерция",
    "sidebar.item.authentication": "Аутентификация",
    "sidebar.item.loginV1": "Вход v1",
    "sidebar.item.loginV2": "Вход v2",
    "sidebar.item.registerV1": "Регистрация v1",
    "sidebar.item.registerV2": "Регистрация v2",
    "sidebar.item.profile": "Профиль",
    "sidebar.item.others": "Другое",
    "sidebar.item.overview": "Обзор",
    "sidebar.item.mint": "Минт",
    "sidebar.item.redeem": "Ридим",
    "sidebar.item.kyb": "KYB",
    "sidebar.item.reserveTransparency": "Прозрачность резервов",
    "sidebar.item.wallet": "Кошелек",
    "sidebar.item.banking": "Банкинг",
    "sidebar.item.settings": "Настройки",
    "sidebar.item.adminOverview": "Обзор админа",
    "sidebar.item.mintOps": "Минт Ops",
    "sidebar.item.redemptionOps": "Ридим Ops",
    "sidebar.item.kybReview": "Управление организациями",
    "sidebar.item.treasury": "Управление резервами",
    "sidebar.item.riskControls": "Кошельки",
    "sidebar.item.blacklist": "Админы и роли",
    "sidebar.item.contractControls": "Настройки",
    "sidebar.item.unauthorized": "Нет доступа",

    "user.account": "Аккаунт",
    "user.billing": "Биллинг",
    "user.notifications": "Уведомления",
    "user.logOut": "Выйти",
    "user.loggingOut": "Выход...",
    "user.logoutFailed": "Ошибка выхода",

    "auth.login": "Вход",
    "auth.register": "Регистрация",
    "auth.emailAddress": "Email",
    "auth.password": "Пароль",
    "auth.confirmPassword": "Подтвердите пароль",
    "auth.fullName": "Полное имя",
    "auth.rememberMe30Days": "Запомнить меня на 30 дней",
    "auth.pleaseWait": "Пожалуйста, подождите...",
    "auth.loginSuccess": "Успешный вход",
    "auth.registerSuccess": "Успешная регистрация",
    "auth.loginFailed": "Ошибка входа",
    "auth.registerFailed": "Ошибка регистрации",
    "auth.helloAgain": "С возвращением",
    "auth.loginToContinue": "Войдите, чтобы продолжить",
    "auth.welcomeBackMessage": "С возвращением. Введите email и пароль.",
    "auth.registerIntro": "Заполните данные ниже, чтобы создать аккаунт.",
    "auth.dontHaveAccount": "Нет аккаунта?",
    "auth.alreadyHaveAccount": "Уже есть аккаунт?",
    "auth.welcome": "Добро пожаловать!",
    "auth.rightPlace": "Вы в правильном месте.",
    "auth.loginToAccount": "Войдите в аккаунт",
    "auth.createAccount": "Создайте аккаунт",
    "auth.enterDetailsToLogin": "Пожалуйста, введите данные для входа.",
    "auth.enterDetailsToRegister":
      "Пожалуйста, введите данные для регистрации.",
    "auth.orContinueWith": "Или продолжить через",
    "auth.continueWithGoogle": "Продолжить с Google",
    "auth.v2.tagline": "Проектируй. Создавай. Запускай. Повторяй.",
    "auth.v2.readyToLaunchTitle": "Готовы к запуску?",
    "auth.v2.readyToLaunchDesc":
      "Клонируйте репозиторий, установите зависимости, и панель будет готова за минуты.",
    "auth.v2.needHelpTitle": "Нужна помощь?",
    "auth.v2.needHelpDesc":
      "Посмотрите документацию или откройте issue на GitHub — поддержка сообщества в один клик.",
  },
  az: {
    "common.language": "Dil",
    "language.english": "İngilis",
    "language.turkish": "Türk",
    "language.russian": "Rus",
    "language.azerbaijani": "Azərbaycan",

    "sidebar.quickCreate": "Tez Yarat",
    "sidebar.inbox": "Gələnlər",
    "sidebar.soon": "Tezliklə",
    "sidebar.group.dashboards": "İdarə Panelləri",
    "sidebar.group.pages": "Səhifələr",
    "sidebar.group.misc": "Digər",
    "sidebar.group.user": "İstifadəçi",
    "sidebar.group.admin": "Admin",
    "sidebar.group.legacy": "Köhnə",
    "sidebar.group.system": "Sistem",
    "sidebar.item.default": "Standart",
    "sidebar.item.crm": "CRM",
    "sidebar.item.finance": "Maliyyə",
    "sidebar.item.analytics": "Analitika",
    "sidebar.item.users": "İstifadəçilər",
    "sidebar.item.ecommerce": "E-ticarət",
    "sidebar.item.authentication": "Autentifikasiya",
    "sidebar.item.loginV1": "Giriş v1",
    "sidebar.item.loginV2": "Giriş v2",
    "sidebar.item.registerV1": "Qeydiyyat v1",
    "sidebar.item.registerV2": "Qeydiyyat v2",
    "sidebar.item.profile": "Profil",
    "sidebar.item.others": "Digərləri",
    "sidebar.item.overview": "İcmal",
    "sidebar.item.mint": "Mint",
    "sidebar.item.redeem": "Redeem",
    "sidebar.item.kyb": "KYB",
    "sidebar.item.reserveTransparency": "Ehtiyat Şəffaflığı",
    "sidebar.item.wallet": "Cüzdan",
    "sidebar.item.banking": "Bankçılıq",
    "sidebar.item.settings": "Parametrlər",
    "sidebar.item.adminOverview": "Admin İcmalı",
    "sidebar.item.mintOps": "Mint Əməliyyatları",
    "sidebar.item.redemptionOps": "Redeem Əməliyyatları",
    "sidebar.item.kybReview": "Qurum İdarəetməsi",
    "sidebar.item.treasury": "Ehtiyat İdarəetməsi",
    "sidebar.item.riskControls": "Cüzdan",
    "sidebar.item.blacklist": "Admin və Rol İdarəetməsi",
    "sidebar.item.contractControls": "Parametrlər",
    "sidebar.item.unauthorized": "İcazəsiz",

    "user.account": "Hesab",
    "user.billing": "Ödəniş",
    "user.notifications": "Bildirişlər",
    "user.logOut": "Çıxış",
    "user.loggingOut": "Çıxış edilir...",
    "user.logoutFailed": "Çıxış alınmadı",

    "auth.login": "Giriş",
    "auth.register": "Qeydiyyat",
    "auth.emailAddress": "E-poçt ünvanı",
    "auth.password": "Şifrə",
    "auth.confirmPassword": "Şifrəni təsdiqlə",
    "auth.fullName": "Ad Soyad",
    "auth.rememberMe30Days": "Məni 30 gün xatırla",
    "auth.pleaseWait": "Zəhmət olmasa gözləyin...",
    "auth.loginSuccess": "Giriş uğurlu oldu",
    "auth.registerSuccess": "Qeydiyyat uğurlu oldu",
    "auth.loginFailed": "Giriş alınmadı",
    "auth.registerFailed": "Qeydiyyat alınmadı",
    "auth.helloAgain": "Yenidən salam",
    "auth.loginToContinue": "Davam etmək üçün daxil olun",
    "auth.welcomeBackMessage": "Xoş gəlmisiniz. E-poçt və şifrənizi daxil edin.",
    "auth.registerIntro": "Hesab yaratmaq üçün məlumatlarınızı daxil edin.",
    "auth.dontHaveAccount": "Hesabınız yoxdur?",
    "auth.alreadyHaveAccount": "Artıq hesabınız var?",
    "auth.welcome": "Xoş gəlmisiniz!",
    "auth.rightPlace": "Doğru yersiniz.",
    "auth.loginToAccount": "Hesabınıza daxil olun",
    "auth.createAccount": "Hesab yaradın",
    "auth.enterDetailsToLogin": "Daxil olmaq üçün məlumatlarınızı daxil edin.",
    "auth.enterDetailsToRegister": "Qeydiyyatdan keçmək üçün məlumatlarınızı daxil edin.",
    "auth.orContinueWith": "Və ya davam edin",
    "auth.continueWithGoogle": "Google ilə davam edin",
    "auth.v2.tagline": "Dizayn et. Qur. Yayımla. Təkrarla.",
    "auth.v2.readyToLaunchTitle": "Yayıma hazırsınız?",
    "auth.v2.readyToLaunchDesc":
      "Reponu klonlayın, asılılıqları quraşdırın və idarə paneliniz dəqiqələr içində hazır olsun.",
    "auth.v2.needHelpTitle": "Yardıma ehtiyacınız var?",
    "auth.v2.needHelpDesc":
      "Sənədlərə baxın və ya GitHub-da issue açın — icma dəstəyi bir kliklə əlçatandır.",
  },
};
