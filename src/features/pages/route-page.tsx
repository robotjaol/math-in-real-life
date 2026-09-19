"use client";
import { LearningPath, Library, TopicDomainPage } from "./catalog";
import { Challenge, PracticePage } from "./practice";
import { MistakePage, ProgressPage } from "./progress";
import { AboutPage, ReferencePage } from "./reference";
import { SettingsPage } from "./settings";
import { QuestionPage } from "@/features/question-runner/runner";
import { SolutionPage } from "@/features/question-runner/solution";
export function RoutePage({route}:{route:string}){
  switch(route){
    case "learn":return <LearningPath/>;
    case "problems":return <Library/>;
    case "level":return <Library levelMode/>;
    case "topics":return <TopicDomainPage mode="topics"/>;
    case "domains":return <TopicDomainPage mode="domains"/>;
    case "practice":return <PracticePage/>;
    case "assessment":return <PracticePage assessment/>;
    case "daily":return <Challenge daily/>;
    case "random":return <Challenge/>;
    case "question":return <QuestionPage/>;
    case "solution":return <SolutionPage/>;
    case "progress":return <ProgressPage/>;
    case "statistics":return <ProgressPage statistics/>;
    case "mistakes":return <MistakePage/>;
    case "reference":return <ReferencePage/>;
    case "guide":return <ReferencePage guideMode/>;
    case "settings":return <SettingsPage/>;
    case "about":return <AboutPage/>;
    default:return <div className="page">Halaman tidak ditemukan.</div>;
  }
}
