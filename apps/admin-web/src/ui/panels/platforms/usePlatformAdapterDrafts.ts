import { useState } from "react";
import type {
  QqOfficialIntegration,
  TelegramIntegration,
  WecomIntegration,
  WeixinOcIntegration
} from "../../../api/types";
import type { PlatformAdapterDialogState, PlatformAdapterKind } from "./PlatformAdapterDialog";
import type { QqOfficialIntegrationDraft } from "./QqOfficialIntegrationForm";
import type { TelegramIntegrationDraft } from "./TelegramIntegrationForm";
import type { WecomIntegrationDraft } from "./WecomIntegrationForm";
import type { WeixinOcIntegrationDraft } from "./WeixinOcIntegrationForm";
import {
  defaultQqDraft,
  defaultTelegramDraft,
  defaultWecomDraft,
  defaultWeixinOcDraft,
  qqDraftFromIntegration,
  telegramDraftFromIntegration,
  wecomDraftFromIntegration,
  weixinOcDraftFromIntegration
} from "./platformDrafts";

export function usePlatformAdapterDrafts() {
  const [adapterDialog, setAdapterDialog] = useState<PlatformAdapterDialogState>({
    open: false,
    selectedAdapter: "weixin_oc"
  });
  const [telegramDraft, setTelegramDraft] =
    useState<TelegramIntegrationDraft>(defaultTelegramDraft);
  const [qqDraft, setQqDraft] = useState<QqOfficialIntegrationDraft>(defaultQqDraft);
  const [wecomDraft, setWecomDraft] = useState<WecomIntegrationDraft>(defaultWecomDraft);
  const [weixinOcDraft, setWeixinOcDraft] =
    useState<WeixinOcIntegrationDraft>(defaultWeixinOcDraft);

  function resetDrafts() {
    setTelegramDraft(defaultTelegramDraft());
    setQqDraft(defaultQqDraft());
    setWecomDraft(defaultWecomDraft());
    setWeixinOcDraft(defaultWeixinOcDraft());
  }

  function openNewAdapterDialog() {
    resetDrafts();
    setAdapterDialog(emptyDialog("weixin_oc"));
  }

  function closeAdapterDialog() {
    resetDrafts();
    setAdapterDialog((current) => ({
      ...current,
      open: false,
      editingIntegrationId: undefined,
      weixinOcQrImageUrl: undefined,
      weixinOcQrContent: undefined,
      weixinOcQrStatus: undefined
    }));
  }

  function openEditDialog(selectedAdapter: PlatformAdapterKind, editingIntegrationId: string) {
    setAdapterDialog({
      ...emptyDialog(selectedAdapter),
      editingIntegrationId
    });
  }

  function editTelegramIntegration(integration: TelegramIntegration) {
    setTelegramDraft(telegramDraftFromIntegration(integration));
    openEditDialog("telegram", integration.id);
  }

  function editQqIntegration(integration: QqOfficialIntegration) {
    setQqDraft(qqDraftFromIntegration(integration));
    openEditDialog("qq", integration.id);
  }

  function editWecomIntegration(integration: WecomIntegration) {
    setWecomDraft(wecomDraftFromIntegration(integration));
    openEditDialog("wecom", integration.id);
  }

  function editWeixinOcIntegration(integration: WeixinOcIntegration) {
    setWeixinOcDraft(weixinOcDraftFromIntegration(integration));
    openEditDialog("weixin_oc", integration.id);
  }

  return {
    adapterDialog,
    setAdapterDialog,
    telegramDraft,
    setTelegramDraft,
    qqDraft,
    setQqDraft,
    wecomDraft,
    setWecomDraft,
    weixinOcDraft,
    setWeixinOcDraft,
    openNewAdapterDialog,
    closeAdapterDialog,
    editTelegramIntegration,
    editQqIntegration,
    editWecomIntegration,
    editWeixinOcIntegration
  };
}

function emptyDialog(selectedAdapter: PlatformAdapterKind): PlatformAdapterDialogState {
  return {
    open: true,
    selectedAdapter,
    weixinOcQrImageUrl: undefined,
    weixinOcQrContent: undefined,
    weixinOcQrStatus: undefined
  };
}
