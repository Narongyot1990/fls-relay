import type { CSSProperties } from "react";

/** AI-generated raster atlas, rendered without modifying or duplicating the source image. */
const columns = [[42, 243], [284, 490], [511, 746], [758, 981], [997, 1224]];
const rows = [[33, 280], [308, 528], [558, 758], [786, 989], [1024, 1232]];
const names = ["inventory", "site", "transfer", "receipt", "phone", "return", "exchange", "history", "policy", "people", "search", "info", "check", "back", "next", "edit", "delete", "add", "home", "spreadsheet", "upload", "shield", "chevron", "loading", "accessories"] as const;
export type BrandIconName = typeof names[number];
type IconProps = { size?: number; className?: string; strokeWidth?: number; style?: CSSProperties; "aria-hidden"?: boolean | "true" | "false" };

export function BrandIcon({ name, size = 24, className = "", style }: IconProps & { name: BrandIconName }) {
  const index = names.indexOf(name);
  const [x, right] = columns[index % 5];
  const [y, bottom] = rows[Math.floor(index / 5)];
  const width = right - x, height = bottom - y;
  const scale = size / Math.max(width, height);
  return <span aria-hidden="true" data-brand-icon={name} className={`fls-icon inline-flex shrink-0 items-center justify-center align-middle ${className}`} style={{ width: size, height: size, ...style }}><span className="block bg-no-repeat" style={{ width: width * scale, height: height * scale, backgroundImage: "url('/brand/fls-icon-atlas.png')", backgroundSize: `${1254 * scale}px ${1254 * scale}px`, backgroundPosition: `${-x * scale}px ${-y * scale}px` }} /></span>;
}

const icon = (name: BrandIconName) => function Icon(props: IconProps) { return <BrandIcon name={name} {...props} />; };
export const ClipboardList = icon("inventory");
export const MapPin = icon("site");
export const Send = icon("transfer");
export const CheckCircle2 = icon("receipt");
export const Smartphone = icon("phone");
export const Undo2 = icon("return");
export const ArrowRightLeft = icon("exchange");
export const History = icon("history");
export const FileText = icon("policy");
export const Users = icon("people");
export const Search = icon("search");
export const Info = icon("info");
export const Check = icon("check");
export const ArrowLeft = icon("back");
export const ArrowRight = icon("next");
export const Pencil = icon("edit");
export const Trash2 = icon("delete");
export const Plus = icon("add");
export const Home = icon("home");
export const FileSpreadsheet = icon("spreadsheet");
export const Upload = icon("upload");
export const ShieldCheck = icon("shield");
export const ChevronRight = icon("chevron");
export const LoaderCircle = icon("loading");
export function XIcon(props: IconProps) { return <BrandIcon name="add" {...props} style={{ transform: "rotate(45deg)", ...props.style }} />; }
