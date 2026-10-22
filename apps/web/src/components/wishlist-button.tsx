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
  /** Estilo para superponer sobre la imagen de una card. */
  overlay?: boolean;
}

/**
 * Agregar/quitar de favoritos. Solo se renderiza con sesión iniciada
 * (los favoritos se guardan por usuario en el backend).
 */
export function WishlistButton({ productVariantId, isInWishlist, size = 22, overlay = false }: WishlistButtonProps) {
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
    <Tooltip label={isInWishlist ? "Quitar de favoritos" : "Agregar a favoritos"} withArrow>
      <ActionIcon
        variant={overlay ? "default" : "subtle"}
        color="dark"
        radius={overlay ? "xl" : undefined}
        size={overlay ? 36 : undefined}
        loading={toggle.isPending}
        onClick={(event) => {
          // La card entera es un link: evitamos que el corazón navegue al producto.
          event.preventDefault();
          event.stopPropagation();
          toggle.mutate();
        }}
        aria-label={isInWishlist ? "Quitar de favoritos" : "Agregar a favoritos"}
        style={
          overlay
            ? {
                backgroundColor: "rgba(252, 249, 248, 0.94)",
                border: "1px solid #0d0d0d",
                color: "#0d0d0d",
              }
            : undefined
        }
      >
        {isInWishlist ? <IconHeartFilled size={size} /> : <IconHeart size={size} />}
      </ActionIcon>
    </Tooltip>
  );
}
