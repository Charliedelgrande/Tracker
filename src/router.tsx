import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import { DashboardPage } from '@/pages/dashboard'
import { CaloriesPage } from '@/pages/calories'
import { WeightPage } from '@/pages/weight'
import { WorkoutsPage } from '@/pages/workouts'
import { WorkoutDetailPage } from '@/pages/workout-detail'
import { ExercisesPage } from '@/pages/exercises'
import { ExerciseDetailPage } from '@/pages/exercise-detail'
import { GoalsPage } from '@/pages/goals'
import { InsightsPage } from '@/pages/insights'
import { SettingsPage } from '@/pages/settings'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/calories', element: <CaloriesPage /> },
      { path: '/weight', element: <WeightPage /> },
      { path: '/workouts', element: <WorkoutsPage /> },
      { path: '/workouts/:workoutId', element: <WorkoutDetailPage /> },
      { path: '/exercises', element: <ExercisesPage /> },
      { path: '/exercises/:exerciseId', element: <ExerciseDetailPage /> },
      { path: '/goals', element: <GoalsPage /> },
      { path: '/insights', element: <InsightsPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
])


