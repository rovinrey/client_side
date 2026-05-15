import { Navigate, useSearchParams } from 'react-router-dom';
import BeforeAfterLiquidationReport from './BeforeAfterLiquidationReport';

// Placeholder wrapper so we can later bind program-specific payload.
export default function BeforeAfterLiquidationRoute() {
  const [params] = useSearchParams();

  // If in future you pass program_id/name, we can prefill.
  // For now we just render the demo payload component.
  if (!params) {
    return <Navigate to="/programs" replace />;
  }

  return <BeforeAfterLiquidationReport />;
}

