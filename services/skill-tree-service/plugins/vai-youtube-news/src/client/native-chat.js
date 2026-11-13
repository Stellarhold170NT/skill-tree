/** Retain Harness sessions for an embedded conversation without changing navigation. */
export function nativeChatBridge(ctx) {
  let scope;
  const watchers = new Set();
  ctx.inject(['sessions', 'uiSession', 'uiWorkspace'], child => {
    scope = child;
    for (const notify of watchers) notify();
    return () => { scope = undefined; for (const notify of watchers) notify(); };
  });
  return {
    defaultChatWorkspace() {
      const items = scope?.uiWorkspace.workspaces.list.getSnapshot().items ?? [];
      const preferred = items.find(w => w.title === 'default-workspace' || /(?:^|\/)default-workspace$/.test(w.path || ''));
      return (preferred ?? items[0])?.workspaceId;
    },
    watchChatWorkspaces(listener) {
      watchers.add(listener);
      const unsubscribe = scope?.uiWorkspace.workspaces.list.subscribe(listener) ?? (() => {});
      return () => { watchers.delete(listener); unsubscribe(); };
    },
    chatWorkspaces() {
      return scope?.uiWorkspace.workspaces.list.getSnapshot().items.map(w => ({ id:w.workspaceId, name:w.title || w.name || w.path, path:w.path })) ?? [];
    },
    async openChat({ workspaceId, sessionId }) {
      if (!scope) throw new Error('Dịch vụ hội thoại của Harness chưa sẵn sàng');
      const active=scope;
      if (!active.uiWorkspace.workspaces.list.getSnapshot().items.some(w=>w.workspaceId===workspaceId)) throw new Error('Hãy chọn một workspace');
      const id=sessionId || await active.sessions.create({workspaceId});
      const reference=active.sessions.retain(id,{source:'qiaomu-rss'});
      try {
        const source=active.uiSession.bindingSource(reference);
        if(typeof source.value.props.inputActions?.setDraft!=='function') throw new Error('Phiên bản Harness hiện tại không hỗ trợ trợ lý đọc');
        return {sessionId:id,reference,release:()=>reference.release(),
          async sendPrompt(prompt) {
            const { input } = source.value.hooks ?? {};
            const actions = source.value.props.inputActions;
            if(typeof actions.submit !== 'function' || typeof input?.getSnapshot !== 'function' || typeof input?.subscribe !== 'function') throw new Error('Phiên bản Harness hiện tại không hỗ trợ gửi nhanh');
            const state = input.getSnapshot();
            if(state.phase !== 'plain') throw new Error('Ô nhập đang xử lý tin nhắn, thử lại sau');
            if(state.attachmentIds?.length) throw new Error('Ô nhập còn tệp đính kèm, hãy xử lý trước');
            if(state.draft.trim()) throw new Error('Ô nhập đang có bản nháp, hãy gửi hoặc xóa bản nháp trước');
            actions.setDraft(prompt);
            if(input.getSnapshot().draft !== prompt) await new Promise((resolve,reject) => {
              const timeout = setTimeout(() => { unsubscribe(); reject(new Error('Đã đưa lệnh vào ô nhập, hãy gửi thủ công')); }, 1200);
              const unsubscribe = input.subscribe(() => {
                if(input.getSnapshot().draft === prompt) { clearTimeout(timeout); unsubscribe(); resolve(); }
              });
              if(input.getSnapshot().draft === prompt) { clearTimeout(timeout); unsubscribe(); resolve(); }
            });
            if(input.getSnapshot().phase !== 'plain') throw new Error('Ô nhập đang xử lý tin nhắn, thử lại sau');
            actions.submit();
          }};
      } catch(error){reference.release();throw error;}
    },
  };
}
