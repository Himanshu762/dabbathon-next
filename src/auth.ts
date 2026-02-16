export function setAdminAuthed(v: boolean) {
    try {
        if (v) sessionStorage.setItem('adminAuthed', 'true');
        else sessionStorage.removeItem('adminAuthed');
        window.dispatchEvent(new Event('admin-auth-changed'));
    } catch { }
}

export function isAdminAuthed(): boolean {
    try { return sessionStorage.getItem('adminAuthed') === 'true'; } catch { return false; }
}
