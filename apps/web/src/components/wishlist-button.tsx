"use client";

import { ActionIcon, Tooltip } from "@mantine/core";
import { IconHeart, IconHeartFilled } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "../lib/api";
import { notifyError, notifySuccess } from "../lib/notifications";
import { useAuthStore } from "../store/auth-store";

interface WishlistButtonProps {
  productVariantId: string;
  isInWishlist?: boolean;
  size?: number;
}

export function WishlistButton({ productVariantId, isInWishlist, size = 22 }: WishlistButtonProps) {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const toggle = useMutation({
    mutationFn: async () => {
      if (isInWishlist) {
        const { error } = await apiClient.DELETE("/wishlist/{productVariantId}", {
          params: { path: { productVariantId } },
        });
        if (error) throw error;
      } else {
        const { error } = await apiClient.POST("/wishlist", {
          body: { productVariantId },
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      notifySuccess({ title: isInWishlist ? "Quitado de favoritos" : "Agregado a favoritos" });
    },
    onError: () => {
      notifyError({ title: "No se pudo actualizar favoritos" });
    },
  });

  if (!isAuthenticated) return null;

  return (
    <Tooltip label={isInWishlist ? "Quitar de favoritos" : "Agregar a favoritos"}>
      <ActionIcon
        variant="subtle"
        color="dark"
        loading={toggle.isPending}
        onClick={() => toggle.mutate()}
        aria-label={isInWishlist ? "Quitar de favoritos" : "Agregar a favoritos"}
      >
        {isInWishlist ? <IconHeartFilled size={size} /> : <IconHeart size={size} />}
      </ActionIcon>
    </Tooltip>
  );
}
