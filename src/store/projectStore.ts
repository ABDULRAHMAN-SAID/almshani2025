import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "./persistStorage";
import { demoOf, TEMPLATES } from "@/product/templates";
import type { Offer, Plan, Project, TradeKey } from "@/product/types";

/**
 * مشروع الزبون وحالة اشتراكه — على الجهاز أوّلًا.
 *
 * ولماذا على الجهاز قبل الخادم؟ لأن أوّل دقيقتين تقرّران: من يُطلب منه حسابٌ
 * قبل أن يرى شيئًا يُغلق التطبيق. فيكتب اسم مشروعه ويرى واجهته في الحال،
 * ولا يُطلب حسابٌ إلّا عند النشر — وحينها يكون قد رأى ما يشتريه.
 */

const TRIAL_DAYS = 14;

interface ProjectState {
  project: Project;
  plan: Plan;
  hasHydrated: boolean;
  /** هل لمس المشروع أصلًا؟ يُفرّق بين «جديد» و«بدأ». */
  started: boolean;

  patch: (patch: Partial<Project>) => void;
  chooseTemplate: (templateId: string) => void;
  chooseTrade: (trade: TradeKey) => void;
  setOffers: (offers: Offer[]) => void;
  startTrial: () => void;
  publish: () => void;
  reset: () => void;
  setHasHydrated: (value: boolean) => void;
}

/** مشروعٌ فارغ بقالبٍ أوّل — لا صفحةٌ بيضاء. */
function blank(): Project {
  const demo = demoOf(TEMPLATES[0].id);
  return { ...demo, name: "", tagline: "", about: "", slug: "", phone: "", whatsapp: "", instagram: undefined };
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      project: blank(),
      plan: { subscribed: false },
      hasHydrated: false,
      started: false,

      patch: (patch) =>
        set((state) => ({ started: true, project: { ...state.project, ...patch } })),

      chooseTemplate: (templateId) =>
        set((state) => ({ started: true, project: { ...state.project, templateId } })),

      // تغيير النشاط يجلب عروضَ النشاط الجديد إن لم يكتب صاحبه عروضه بعد:
      // قائمةُ مطعمٍ في صفحة ورشةٍ أسوأ من قائمةٍ فارغة.
      chooseTrade: (trade) =>
        set((state) => {
          const template = TEMPLATES.find((item) => item.trade === trade) ?? TEMPLATES[0];
          const demo = demoOf(template.id);
          const untouched = state.project.offers.every((offer, index) =>
            offer.name === demoOf(state.project.templateId).offers[index]?.name
          );
          return {
            started: true,
            project: {
              ...state.project,
              trade,
              templateId: template.id,
              offers: untouched ? demo.offers : state.project.offers,
            },
          };
        }),

      setOffers: (offers) => set((state) => ({ started: true, project: { ...state.project, offers } })),

      startTrial: () =>
        set((state) =>
          state.plan.trialStartedAt
            ? state
            : { plan: { ...state.plan, trialStartedAt: new Date().toISOString() } }
        ),

      publish: () =>
        set((state) => ({ project: { ...state.project, publishedAt: new Date().toISOString() } })),

      reset: () => set({ project: blank(), started: false }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "wajha-project",
      storage: persistStorage,
      partialize: (state) => ({ project: state.project, plan: state.plan, started: state.started }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    }
  )
);

/* ------------------------------ حساب التجربة ------------------------------ */

export interface TrialState {
  /** لم تبدأ بعد. */
  fresh: boolean;
  /** أيامٌ باقية — صفرٌ يعني انتهت. */
  daysLeft: number;
  active: boolean;
  expired: boolean;
}

export function trialOf(plan: Plan, now: Date = new Date()): TrialState {
  if (plan.subscribed) return { fresh: false, daysLeft: 365, active: true, expired: false };
  if (!plan.trialStartedAt) return { fresh: true, daysLeft: TRIAL_DAYS, active: false, expired: false };
  const started = new Date(plan.trialStartedAt).getTime();
  const passed = Math.floor((now.getTime() - started) / 86_400_000);
  const daysLeft = Math.max(0, TRIAL_DAYS - passed);
  return { fresh: false, daysLeft, active: daysLeft > 0, expired: daysLeft === 0 };
}

export const TRIAL_LENGTH = TRIAL_DAYS;
