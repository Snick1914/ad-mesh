interface DecodedToken {
  isSuperuser: boolean;
  userName: string;
  userEmail: string;
  userLinkingCode: string;
  maxStorageGb: number | null;
}

export function decodeAuthToken(): DecodedToken {
  const result: DecodedToken = {
    isSuperuser: false,
    userName: 'Usuario ad-mesh',
    userEmail: '',
    userLinkingCode: '',
    maxStorageGb: null,
  };

  const token = localStorage.getItem('token');
  if (!token) return result;

  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    if (!payload) return result;

    if (payload.is_superuser) result.isSuperuser = true;
    if (payload.full_name) result.userName = payload.full_name;
    else if (payload.email) result.userName = payload.email.split('@')[0];
    if (payload.email) result.userEmail = payload.email;
    if (payload.linking_code) result.userLinkingCode = payload.linking_code;
    if (payload.max_storage_gb) result.maxStorageGb = payload.max_storage_gb;
  } catch (e) {
    console.error('Error decoding auth token:', e);
  }

  return result;
}

export function useAuthToken(): DecodedToken {
  return decodeAuthToken();
}
