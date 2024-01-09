import { DocHandle, DocHandleChangePayload } from "@automerge/automerge-repo";
import { Compartment, Transaction } from "@codemirror/state";
import { Prop } from "@automerge/automerge";
import { EditorView } from "@codemirror/view";
import { useEffect } from "react";
import { PatchSemaphore, plugin as amgPlugin } from "@automerge/automerge-codemirror";

const amCompartment = new Compartment();
export const amExtension = amCompartment.of([]);

const traversePath = (obj: any, path: Prop[]): any => path.length === 0 ? obj : traversePath(obj[path[0]], path.slice(1));

let dispatchTransactions: (trs: readonly Transaction[]) => void;

export const useAMExtension = (view: EditorView | undefined | null, handle: DocHandle<any> | undefined, fieldPath: Prop[]) => {
    useEffect(() => {
        if(!view || !handle) return;
        let handleChange: (payload: DocHandleChangePayload<any>) => void;
        let mounted = true;

        void async function() {
            const doc = await handle.doc();
            if (!doc) return;
            const source = traversePath(doc, fieldPath);
            const plugin = amgPlugin(doc, fieldPath); // path is an object path (list of keys)
            const semaphore = new PatchSemaphore(plugin);

            handleChange =
                // unsure what these parameters are for, they're in the automerge example though
                ({ doc: _doc, patchInfo: _patchInfo }: DocHandleChangePayload<any>) => {
                    semaphore.reconcile(handle, view);
                };
            if(!mounted) return;
            handle.addListener("change", handleChange);

            dispatchTransactions = null!;
            view.dispatch({
                changes: {
                    from: 0,
                    to: view.state.doc.toString().length,
                    insert: source
                }
            });

            dispatchTransactions = trs => {
                view.update(trs);
                semaphore.reconcile(handle, view);
            }

            view.dispatch({
                effects: [
                    amCompartment.reconfigure(plugin)
                ]
            });
        }();

        return () => {
            mounted = false;
            if(!handleChange) return;
            handle.removeListener("change", handleChange);
        };
    }, [handle, view]);
}

export const makeDispatchTransactions = (viewGetter: () => EditorView) => (trs: readonly Transaction[]) => {
    (dispatchTransactions ?? (trs => viewGetter().update(trs)))(trs);
};