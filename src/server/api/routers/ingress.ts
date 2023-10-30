import type { CreateIngressOptions } from "livekit-server-sdk";
import {
  IngressAudioEncodingPreset,
  IngressInput,
  IngressVideoEncodingPreset,
} from "livekit-server-sdk";
import { TrackSource } from "livekit-server-sdk/dist/proto/livekit_models";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const ingressRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        roomSlug: z
          .string()
          .regex(/^([a-z][a-z0-9]*)(-[a-z0-9]+)*$/)
          .min(3),
        streamerName: z.string().min(3),
        isWhip: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { ingressClient } = ctx;

      const options: CreateIngressOptions = {
        name: input.roomSlug,
        roomName: input.roomSlug,
        participantName: input.streamerName,
        participantIdentity: input.roomSlug,
      };

      if (input.isWhip) {
        // https://docs.livekit.io/egress-ingress/ingress/overview/#bypass-transcoding-for-whip-sessions
        options.bypassTranscoding = true;
      } else {
        options.video = {
          source: TrackSource.CAMERA,
          preset: IngressVideoEncodingPreset.H264_1080P_30FPS_3_LAYERS,
        };
        options.audio = {
          source: TrackSource.MICROPHONE,
          preset: IngressAudioEncodingPreset.OPUS_STEREO_96KBPS,
        };
      }

      const ingress = await ingressClient.createIngress(
        input.isWhip ? IngressInput.WHIP_INPUT : IngressInput.RTMP_INPUT,
        options
      );

      return ingress;
    }),

  deleteAll: publicProcedure.mutation(async ({ ctx }) => {
    const { ingressClient } = ctx;
    const ingresses = await ingressClient.listIngress();

    for (const ingress of ingresses) {
      if (ingress.ingressId) {
        await ingressClient.deleteIngress(ingress.ingressId);
      }
    }
  }),
});
