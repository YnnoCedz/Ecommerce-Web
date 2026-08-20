import {
  BarChart3,
  Bell,
  Boxes,
  BriefcaseBusiness,
  ChartColumn,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  EllipsisVertical,
  Eye,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  Store,
  Tag,
  TrendingUp,
  Truck,
  Users,
  X,
  ShoppingCart,
  BadgeCheck,
  Image as LucideImage,
  FileText,
  CircleCheck,
  CircleX,
  TriangleAlert,
  Info,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Lock,
  Shield,
  Filter,
  ArrowUpDown,
  RefreshCw,
  ExternalLink,
  Copy,
  Save,
  ArrowRight,
  ArrowLeft,
  EyeOff,
  Upload,
  Download,
  User,
  MoreVertical,
} from "lucide-react";

type IconProps = { size?: number; className?: string };

export const IconDashboard = LayoutDashboard;
export const IconProducts = Package;
export const IconInventory = Boxes;
export const IconOrders = ClipboardList;
export const IconCustomers = Users;
export const IconPromotions = Tag;
export const IconAnalytics = ChartColumn;
export const IconMessages = MessageSquare;
export const IconNotifications = Bell;
export const IconStore = Store;
export const IconSettings = Settings;
export const IconUsers = Users;
export const IconSellers = BriefcaseBusiness;
export const IconCategories = LayoutDashboard;
export const IconReports = ShieldAlert;
export const IconModeration = TriangleAlert;
export const IconSearch = Search;
export const IconCart = ShoppingCart;
export const IconHeart = Heart;
export const IconMenu = Menu;
export const IconClose = X;
export const IconChevronDown = ChevronDown;
export const IconChevronRight = ChevronRight;
export const IconChevronLeft = ChevronLeft;
export const IconBell = Bell;
export const IconLogout = LogOut;
export const IconHelp = CircleHelp;
export const IconEye = Eye;
export const IconPlus = Plus;
export const IconHome = Home;
export const IconTrendUp = TrendingUp;
export const IconBox = Package;

export const IconBadgeCheck = BadgeCheck;
export const IconImage = LucideImage;
export const IconFileText = FileText;
export const IconCircleCheck = CircleCheck;
export const IconCircleX = CircleX;
export const IconWarning = TriangleAlert;
export const IconInfo = Info;
export const IconMail = Mail;
export const IconPhone = Phone;
export const IconMapPin = MapPin;
export const IconCalendar = Calendar;
export const IconClock = Clock;
export const IconLock = Lock;
export const IconShield = Shield;
export const IconFilter = Filter;
export const IconArrowUpDown = ArrowUpDown;
export const IconRefreshCw = RefreshCw;
export const IconExternalLink = ExternalLink;
export const IconCopy = Copy;
export const IconSave = Save;
export const IconArrowRight = ArrowRight;
export const IconArrowLeft = ArrowLeft;
export const IconEyeOff = EyeOff;
export const IconUpload = Upload;
export const IconDownload = Download;
export const IconUser = User;
export const IconMoreVertical = MoreVertical;

// Backward-compatible icon component signature for existing shell usage.
export function ShellIcon({ size = 18, className = "" }: IconProps) {
  return <LayoutDashboard size={size} className={className} aria-hidden="true" />;
}
