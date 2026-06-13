import { allDisciplines } from '@/lib/store'
import DiscClient from './client'
export const dynamic = 'force-dynamic'
export default function DisciplinesAdmin() {
  return <DiscClient initial={allDisciplines()}/>
}
