import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "./persistStorage";
import { demoOf, TEMPLATES } from "@/product/templates";
import type { AppKind, Offer, Project } from "@/product/types";

/**
 * مشروع الزبون — على الجهاز.
 *
 * ولا تجربةَ مؤقّتة ولا عدّاد: النماذج تُشاهَد وتُجرَّب مجانًا وإلى الأبد،
 * والدفعُ ثمنُ **تطبيقك أنت** منشورًا برابطك. فمن أراد أن يرى، يرى؛ ومن
 * أراد أن يملك، يدفع. وهذا أصدق من تجربةٍ تنتهي وتُلاحِق صاحبها.
 */
interface ProjectState {
  project: Project;
  hasHydrated: boolean;
  /** هل لمس المشروع أصلًا؟ يُفرّق بين «جديد» و«بدأ». */
  started: boolean;

  patch: (patch: Partial<Project>) => void;
  chooseTemplate: (templateId: string) => void;
  setOffers: (offers: Offer[]) => void;
  publish: () => void;
  reset: () => void;
  setHasHydrated: (value: boolean) => void;
}

/** مشروعٌ فارغ بأوّل نوع — لا صفحةٌ بيضاء. */
function blank(): Project {
  const demo = demoOf(TEMPLATES[0].id);
  return { ...demo, name: "", tagline: "", about: "", slug: "", phone: "", whatsapp: "", instagram: undefined };
}

/** النوع يتبع القالب دائمًا: قالبُ مطعمٍ بشاشات حجزٍ لا معنى له. */
function withTemplate(project: Project, templateId: string): Project {
  const template = TEMPLATES.find((item) => item.id === templateId) ?? TEMPLATES[0];
  const demo = demoOf(template.id);
  const kind: AppKind = template.kind;
  // ما لم يكتب صاحبُه محتواه بعد يُملأ من التجريبيّ الموافق للنوع: قائمةُ
  // مطعمٍ في تطبيق عيادةٍ أسوأ من قائمةٍ فارغة.
  const untouched =
    project.offers.length === 0 ||
    project.offers.every((offer, index) => offer.name === demoOf(project.templateId).offers[index]?.name);
  return {
    ...project,
    templateId: template.id,
    kind,
    offers: untouched ? demo.offers : project.offers,
    people: project.people.length > 0 && project.kind === kind ? project.people : demo.people,
    courses: project.courses.length > 0 && project.kind === kind ? project.courses : demo.courses,
  };
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      project: blank(),
      hasHydrated: false,
      started: false,

      patch: (patch) => set((state) => ({ started: true, project: { ...state.project, ...patch } })),
      chooseTemplate: (templateId) =>
        set((state) => ({ started: true, project: withTemplate(state.project, templateId) })),
      setOffers: (offers) => set((state) => ({ started: true, project: { ...state.project, offers } })),
      publish: () =>
        set((state) => ({ project: { ...state.project, publishedAt: new Date().toISOString() } })),
      reset: () => set({ project: blank(), started: false }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "wajha-project",
      storage: persistStorage,
      partialize: (state) => ({ project: state.project, started: state.started }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    }
  )
);
