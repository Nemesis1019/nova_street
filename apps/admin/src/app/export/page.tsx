"use client";

import { Button, Paper, Stack, Title } from "@mantine/core";

import { AdminShell } from "../../components/admin-shell";
import { apiClient } from "../../lib/api";

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

async function exportOrders() {
  const { data, response } = await apiClient.GET("/admin/export/orders", { parseAs: "blob" });
  if (!response.ok || !data) throw new Error("Export failed");
  const filename = response.headers.get("content-disposition")?.split('filename="')[1]?.replace('"', '') ?? "orders.csv";
  downloadBlob(data, filename);
}

async function exportProducts() {
  const { data, response } = await apiClient.GET("/admin/export/products", { parseAs: "blob" });
  if (!response.ok || !data) throw new Error("Export failed");
  const filename = response.headers.get("content-disposition")?.split('filename="')[1]?.replace('"', '') ?? "products.csv";
  downloadBlob(data, filename);
}

export default function ExportPage() {
  return (
    <AdminShell>
      <Title order={1} mb="md">
        Exportaciones
      </Title>
      <Paper p="md" withBorder>
        <Stack>
          <Button onClick={exportOrders}>Exportar pedidos (CSV)</Button>
          <Button onClick={exportProducts}>Exportar productos (CSV)</Button>
        </Stack>
      </Paper>
    </AdminShell>
  );
}
