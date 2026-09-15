import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Locale } from "@/lib/i18n/locale";
import { DEFAULT_DECISIONS } from "./decisions";
import type { CostProfileId } from "./cost-profiles";
import type { Mastery } from "./curriculum";
import { DEFAULT_LAB_ENDPOINTS, type LabEndpoints } from "./walkthrough";
import type {
  Decisions,
  FlowKind,
  InspectorTab,
  InterviewLevel,
  InterviewTrack,
  LabEdge,
  LabNode,
  Lens,
  LoadInputs,
  StackId,
  StudioMode,
  SyncKind,
} from "./types";

type Positions = Record<string, { x: number; y: number }>;

export type PracticeRecord = {
  status: Mastery;
  attempts: number;
  failHistory: string[][];
};

type LabState = {
  locale: Locale;
  lens: Lens;
  inspectorTab: InspectorTab;
  selectedId: string | null;
  selectedEdge: string | null;
  positions: Positions;
  studioMode: StudioMode;
  connectMode: boolean;
  connectFrom: string | null;
  extraNodes: Record<string, LabNode[]>;
  extraEdges: Record<string, LabEdge[]>;
  removedEdges: Record<string, boolean>;
  edgeMeta: Record<string, { flow: FlowKind; sync: SyncKind }>;
  decisions: Decisions;
  load: LoadInputs;
  simulating: boolean;
  interviewLevel: InterviewLevel;
  interviewTrack: InterviewTrack;
  interviewStep: number;
  interviewChecks: Record<string, boolean>;
  envelope: { dau: number; reqPerUser: number; peakX: number };
  cheatOpen: boolean;
  cheatId: string | null;
  practiceStack: StackId;
  practiceProgress: Record<string, PracticeRecord>;
  practiceDrafts: Record<string, string>;
  costProfile: CostProfileId;
  walkthroughStep: number;
  walkthroughChecks: Record<string, boolean>;
  labEndpoints: LabEndpoints;
  setLocale: (locale: Locale) => void;
  setLens: (lens: Lens) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  setSelectedId: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  setNodePosition: (key: string, x: number, y: number) => void;
  setStudioMode: (mode: StudioMode) => void;
  setConnectMode: (on: boolean) => void;
  setConnectFrom: (id: string | null) => void;
  addNode: (scenarioId: string, node: LabNode) => void;
  addEdge: (scenarioId: string, edge: LabEdge) => void;
  removeEdge: (scenarioId: string, from: string, to: string) => void;
  setEdgeMeta: (key: string, flow: FlowKind, sync: SyncKind) => void;
  setDecision: <K extends keyof Decisions>(key: K, value: Decisions[K]) => void;
  setLoad: (partial: Partial<LoadInputs>) => void;
  setSimulating: (on: boolean) => void;
  setInterviewLevel: (level: InterviewLevel) => void;
  setInterviewTrack: (track: InterviewTrack) => void;
  setInterviewStep: (step: number) => void;
  toggleCheck: (id: string) => void;
  setEnvelope: (partial: { dau?: number; reqPerUser?: number; peakX?: number }) => void;
  setCheatOpen: (open: boolean) => void;
  setCheatId: (id: string | null) => void;
  setPracticeStack: (stack: StackId) => void;
  setPracticeDraft: (key: string, code: string) => void;
  recordPracticeResult: (exerciseId: string, passed: boolean, failedIds: string[]) => void;
  resetPractice: (exerciseId: string) => void;
  setCostProfile: (id: CostProfileId) => void;
  setWalkthroughStep: (step: number) => void;
  toggleWalkthroughCheck: (id: string) => void;
  setLabEndpoints: (partial: Partial<LabEndpoints>) => void;
};

export const useLabStore = create<LabState>()(
  persist(
    (set) => ({
      locale: "es",
      lens: "split",
      inspectorTab: "code",
      selectedId: null,
      selectedEdge: null,
      positions: {},
      studioMode: "design",
      connectMode: false,
      connectFrom: null,
      extraNodes: {},
      extraEdges: {},
      removedEdges: {},
      edgeMeta: {},
      decisions: DEFAULT_DECISIONS,
      load: { rps: 800, readRatio: 0.8, dataGb: 80, tokPerReq: 1200 },
      simulating: false,
      interviewLevel: "senior",
      interviewTrack: "backend",
      interviewStep: 0,
      interviewChecks: {},
      envelope: { dau: 1_000_000, reqPerUser: 20, peakX: 3 },
      cheatOpen: false,
      cheatId: null,
      practiceStack: "fastapi",
      practiceProgress: {},
      practiceDrafts: {},
      costProfile: "small",
      walkthroughStep: 0,
      walkthroughChecks: {},
      labEndpoints: DEFAULT_LAB_ENDPOINTS,
      setLocale: (locale) => set({ locale }),
      setLens: (lens) => set({ lens }),
      setInspectorTab: (tab) => set({ inspectorTab: tab }),
      setSelectedId: (id) => set({ selectedId: id, selectedEdge: null }),
      setSelectedEdge: (id) => set({ selectedEdge: id, selectedId: null }),
      setNodePosition: (key, x, y) =>
        set((state) => ({
          positions: { ...state.positions, [key]: { x, y } },
        })),
      setStudioMode: (mode) => set({ studioMode: mode, connectMode: false, connectFrom: null }),
      setConnectMode: (on) => set({ connectMode: on, connectFrom: null }),
      setConnectFrom: (id) => set({ connectFrom: id }),
      addNode: (scenarioId, node) =>
        set((state) => ({
          extraNodes: {
            ...state.extraNodes,
            [scenarioId]: [...(state.extraNodes[scenarioId] ?? []), node],
          },
          selectedId: node.id,
        })),
      addEdge: (scenarioId, edge) =>
        set((state) => {
          const cur = state.extraEdges[scenarioId] ?? [];
          if (cur.some((e) => e.from === edge.from && e.to === edge.to)) return state;
          const removedEdges = { ...state.removedEdges };
          delete removedEdges[`${scenarioId}:${edge.from}->${edge.to}`];
          return {
            extraEdges: { ...state.extraEdges, [scenarioId]: [...cur, edge] },
            removedEdges,
            connectFrom: null,
          };
        }),
      removeEdge: (scenarioId, from, to) =>
        set((state) => {
          const key = `${scenarioId}:${from}->${to}`;
          const extra = (state.extraEdges[scenarioId] ?? []).filter(
            (edge) => !(edge.from === from && edge.to === to),
          );
          return {
            extraEdges: { ...state.extraEdges, [scenarioId]: extra },
            removedEdges: { ...state.removedEdges, [key]: true },
            selectedEdge: null,
          };
        }),
      setEdgeMeta: (key, flow, sync) =>
        set((state) => ({
          edgeMeta: { ...state.edgeMeta, [key]: { flow, sync } },
        })),
      setDecision: (key, value) =>
        set((state) => ({ decisions: { ...state.decisions, [key]: value } })),
      setLoad: (partial) => set((state) => ({ load: { ...state.load, ...partial } })),
      setSimulating: (on) => set({ simulating: on }),
      setInterviewLevel: (level) => set({ interviewLevel: level }),
      setInterviewTrack: (track) =>
        set((state) =>
          state.interviewTrack === track ? state : { interviewTrack: track, interviewStep: 0 },
        ),
      setInterviewStep: (step) => set({ interviewStep: step }),
      toggleCheck: (id) =>
        set((state) => ({
          interviewChecks: {
            ...state.interviewChecks,
            [id]: !state.interviewChecks[id],
          },
        })),
      setEnvelope: (partial) =>
        set((state) => ({ envelope: { ...state.envelope, ...partial } })),
      setCheatOpen: (open) => set({ cheatOpen: open }),
      setCheatId: (id) => set({ cheatId: id, cheatOpen: true }),
      setPracticeStack: (stack) => set({ practiceStack: stack }),
      setPracticeDraft: (key, code) =>
        set((state) => ({ practiceDrafts: { ...state.practiceDrafts, [key]: code } })),
      recordPracticeResult: (exerciseId, passed, failedIds) =>
        set((state) => {
          const current = state.practiceProgress[exerciseId] ?? {
            status: "not-started" as Mastery,
            attempts: 0,
            failHistory: [] as string[][],
          };
          const failHistory = failedIds.length
            ? [...current.failHistory, failedIds].slice(-8)
            : current.failHistory;
          return {
            practiceProgress: {
              ...state.practiceProgress,
              [exerciseId]: {
                status: passed ? "mastered" : "in-progress",
                attempts: current.attempts + 1,
                failHistory,
              },
            },
          };
        }),
      resetPractice: (exerciseId) =>
        set((state) => {
          const next = { ...state.practiceProgress };
          delete next[exerciseId];
          return { practiceProgress: next };
        }),
      setCostProfile: (id) => set({ costProfile: id }),
      setWalkthroughStep: (step) => set({ walkthroughStep: step }),
      toggleWalkthroughCheck: (id) =>
        set((state) => ({
          walkthroughChecks: {
            ...state.walkthroughChecks,
            [id]: !state.walkthroughChecks[id],
          },
        })),
      setLabEndpoints: (partial) =>
        set((state) => ({ labEndpoints: { ...state.labEndpoints, ...partial } })),
    }),
    {
      name: "sdl-lab-v5",
      partialize: (state) => ({
        locale: state.locale,
        lens: state.lens,
        inspectorTab: state.inspectorTab,
        positions: state.positions,
        extraNodes: state.extraNodes,
        extraEdges: state.extraEdges,
        removedEdges: state.removedEdges,
        edgeMeta: state.edgeMeta,
        decisions: state.decisions,
        load: state.load,
        interviewLevel: state.interviewLevel,
        interviewTrack: state.interviewTrack,
        envelope: state.envelope,
        practiceStack: state.practiceStack,
        practiceProgress: state.practiceProgress,
        practiceDrafts: state.practiceDrafts,
        costProfile: state.costProfile,
        walkthroughStep: state.walkthroughStep,
        walkthroughChecks: state.walkthroughChecks,
        labEndpoints: state.labEndpoints,
      }),
    },
  ),
);

export function posKey(scenarioId: string, nodeId: string): string {
  return `${scenarioId}:${nodeId}`;
}

export function extraOf(map: Record<string, LabNode[]>, id: string): LabNode[] {
  return map[id] ?? [];
}

export function extraEdgesOf(map: Record<string, LabEdge[]>, id: string): LabEdge[] {
  return map[id] ?? [];
}

export function draftKey(exerciseId: string, stack: StackId): string {
  return `${exerciseId}:${stack}`;
}

export function practiceStatusOf(
  progress: Record<string, PracticeRecord>,
  exerciseId: string,
): Mastery {
  return progress[exerciseId]?.status ?? "not-started";
}
