"use client";
import { useEffect, useMemo, useState } from "react";

// Languages offered in the creator app. Models are mostly BR/LatAm, so PT + ES.
export type Lang = "en" | "pt" | "es";
export const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: "en", flag: "🇺🇸", label: "EN" },
  { code: "pt", flag: "🇧🇷", label: "PT" },
  { code: "es", flag: "🇪🇸", label: "ES" },
];

type Dict = Record<string, string>;

const EN: Dict = {
  headTitle: "Creator App",
  headSub: "The creator's view — assigned requests and content upload.",
  viewingAs: "Viewing as",
  greet: "Hi {name} 👋",
  noTasks: "No assigned tasks yet.",
  taskCount_one: "{n} assigned task",
  taskCount_other: "{n} assigned tasks",
  loading: "Loading…",
  noModel: "No model selected.",
  back: "Back",
  due: "due {date}",
  statusApproved: "Approved — great work! 🎉",
  statusSubmitted: "Submitted — awaiting manager review.",
  statusChanges: "Changes requested — please review the notes below and re-upload.",
  uploadHeader: "Upload your content",
  noFolder: "No upload folder yet — ask your manager to set it up.",
  submit: "Submit for review",
  resubmit: "Re-submit for review",
  submittedWait: "Submitted — awaiting review",
  briefBrief: "Brief",
  briefNotes: "Manager's Notes",
  briefOutfit: "Outfit Suggestions",
  briefLocation: "Shooting Location",
  briefTips: "Extra Tips",
  briefCaptions: "Captions",
  badgeApproved: "Approved",
  badgeRedo: "Redo",
  uploadTo: "Upload to {label}",
  addMoreTo: "Add more to {label}",
  uploadingTo: "Uploading to {label}…",
  uploadedFiles_one: "{n} file uploaded to {label}",
  uploadedFiles_other: "{n} files uploaded to {label}",
  uploadErrAuth: "Upload not allowed — please sign out and back in.",
  uploadErrFail: "Upload failed. Check your connection and try again.",
  stSubmitted: "Submitted",
  stApproved: "Approved",
  stChanges: "Changes requested",
  stInProgress: "In Progress",
  stTodo: "To do",
  typeDetailed: "Detailed Media",
  typeVideo: "Video",
  typePpvSeq: "PPV Sequence",
  typePpvLong: "PPV Long Video",
  typeGallery: "Media Gallery",
  typeSwipe: "Swipe",
  typeSet: "Content Set",
  typeTask: "Task",
};

const PT: Dict = {
  headTitle: "App da Criadora",
  headSub: "A visão da criadora — solicitações atribuídas e envio de conteúdo.",
  viewingAs: "Visualizando como",
  greet: "Oi {name} 👋",
  noTasks: "Nenhuma tarefa atribuída ainda.",
  taskCount_one: "{n} tarefa atribuída",
  taskCount_other: "{n} tarefas atribuídas",
  loading: "Carregando…",
  noModel: "Nenhuma modelo selecionada.",
  back: "Voltar",
  due: "prazo {date}",
  statusApproved: "Aprovado — ótimo trabalho! 🎉",
  statusSubmitted: "Enviado — aguardando revisão do gerente.",
  statusChanges: "Alterações solicitadas — revise as notas abaixo e reenvie.",
  uploadHeader: "Envie seu conteúdo",
  noFolder: "Nenhuma pasta de upload ainda — peça ao seu gerente para configurar.",
  submit: "Enviar para revisão",
  resubmit: "Reenviar para revisão",
  submittedWait: "Enviado — aguardando revisão",
  briefBrief: "Resumo",
  briefNotes: "Notas do gerente",
  briefOutfit: "Sugestões de roupa",
  briefLocation: "Local da gravação",
  briefTips: "Dicas extras",
  briefCaptions: "Legendas",
  badgeApproved: "Aprovado",
  badgeRedo: "Refazer",
  uploadTo: "Enviar para {label}",
  addMoreTo: "Adicionar mais em {label}",
  uploadingTo: "Enviando para {label}…",
  uploadedFiles_one: "{n} arquivo enviado para {label}",
  uploadedFiles_other: "{n} arquivos enviados para {label}",
  uploadErrAuth: "Envio não permitido — saia e entre novamente.",
  uploadErrFail: "Falha no envio. Verifique sua conexão e tente novamente.",
  stSubmitted: "Enviado",
  stApproved: "Aprovado",
  stChanges: "Alterações solicitadas",
  stInProgress: "Em andamento",
  stTodo: "A fazer",
  typeDetailed: "Mídia detalhada",
  typeVideo: "Vídeo",
  typePpvSeq: "Sequência PPV",
  typePpvLong: "Vídeo PPV longo",
  typeGallery: "Galeria de mídia",
  typeSwipe: "Swipe",
  typeSet: "Conjunto de Conteúdo",
  typeTask: "Tarefa",
};

const ES: Dict = {
  headTitle: "App de Creadora",
  headSub: "La vista de la creadora — solicitudes asignadas y subida de contenido.",
  viewingAs: "Viendo como",
  greet: "¡Hola {name}! 👋",
  noTasks: "Aún no hay tareas asignadas.",
  taskCount_one: "{n} tarea asignada",
  taskCount_other: "{n} tareas asignadas",
  loading: "Cargando…",
  noModel: "Ninguna modelo seleccionada.",
  back: "Volver",
  due: "vence {date}",
  statusApproved: "Aprobado — ¡buen trabajo! 🎉",
  statusSubmitted: "Enviado — esperando revisión del manager.",
  statusChanges: "Cambios solicitados — revisa las notas de abajo y vuelve a subir.",
  uploadHeader: "Sube tu contenido",
  noFolder: "Aún no hay carpeta de subida — pídele a tu manager que la configure.",
  submit: "Enviar para revisión",
  resubmit: "Reenviar para revisión",
  submittedWait: "Enviado — esperando revisión",
  briefBrief: "Resumen",
  briefNotes: "Notas del manager",
  briefOutfit: "Sugerencias de vestuario",
  briefLocation: "Lugar de grabación",
  briefTips: "Consejos extra",
  briefCaptions: "Leyendas",
  badgeApproved: "Aprobado",
  badgeRedo: "Rehacer",
  uploadTo: "Subir a {label}",
  addMoreTo: "Agregar más a {label}",
  uploadingTo: "Subiendo a {label}…",
  uploadedFiles_one: "{n} archivo subido a {label}",
  uploadedFiles_other: "{n} archivos subidos a {label}",
  uploadErrAuth: "Subida no permitida — cierra sesión y vuelve a entrar.",
  uploadErrFail: "Error al subir. Revisa tu conexión e inténtalo de nuevo.",
  stSubmitted: "Enviado",
  stApproved: "Aprobado",
  stChanges: "Cambios solicitados",
  stInProgress: "En progreso",
  stTodo: "Por hacer",
  typeDetailed: "Contenido detallado",
  typeVideo: "Video",
  typePpvSeq: "Secuencia PPV",
  typePpvLong: "Video PPV largo",
  typeGallery: "Galería de medios",
  typeSwipe: "Swipe",
  typeSet: "Conjunto de Contenido",
  typeTask: "Tarea",
};

const DICTS: Record<Lang, Dict> = { en: EN, pt: PT, es: ES };

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

function makeT(lang: Lang): TFn {
  const d = DICTS[lang] || EN;
  return (key, vars) => {
    let s = d[key] ?? EN[key] ?? key;
    if (vars) for (const k in vars) s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(vars[k]));
    return s;
  };
}

// status / type → translation key (cls/icon still come from slots.ts)
export const ST_KEY: Record<string, string> = {
  submitted: "stSubmitted", approved: "stApproved", changes_requested: "stChanges", in_progress: "stInProgress",
};
export const TYPE_KEY: Record<string, string> = {
  detailed: "typeDetailed", video: "typeVideo", ppv_sequence: "typePpvSeq",
  ppv_long: "typePpvLong", images_videos: "typeGallery", swipe: "typeSwipe",
  content_set: "typeSet",
};

export function useAppLang() {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const s = localStorage.getItem("app_lang");
    if (s === "en" || s === "pt" || s === "es") setLangState(s);
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("app_lang", l); } catch { /* ignore */ }
  };
  const t = useMemo(() => makeT(lang), [lang]);
  return { lang, setLang, t };
}
