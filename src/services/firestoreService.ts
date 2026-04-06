import { auth } from '../firebase';
import { OperationType } from '../types';
import { toast } from 'sonner';

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: (auth.currentUser as any)?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  const fullErrorMsg = `Firestore Error (${operationType}): ${errInfo.error}`;
  console.error(fullErrorMsg, JSON.stringify(errInfo));
  
  // Don't toast if it's just a connection issue
  if (!errInfo.error.includes('unavailable') && !errInfo.error.includes('offline')) {
    toast.error(fullErrorMsg);
  }
  
  throw new Error(JSON.stringify(errInfo));
}
