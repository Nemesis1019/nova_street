"use client";

import { Box, Group, Paper, SegmentedControl, SimpleGrid, Table, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { apiClient } from "../lib/api";

const daysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
};

const today = () => new Date().toISOString().split("T")[0];

export function AnalyticsSection() {
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const from = daysAgo(Number(range));
  const to = today();

  const { data: sales } = useQuery({
    queryKey: ["analytics-sales", from, to],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/admin/analytics/sales", {
        params: { query: { from, to } },
      });
      if (error) throw error;
      return data;
    },
  });

  const { data: topProducts } = useQuery({
    queryKey: ["analytics-top-products", from, to],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/admin/analytics/top-products", {
        params: { query: { from, to, limit: "10" } },
      });
      if (error) throw error;
      return data;
    },
  });

  const { data: conversion } = useQuery({
    queryKey: ["analytics-conversion", from, to],
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/admin/analytics/conversion", {
        params: { query: { from, to } },
      });
      if (error) throw error;
      return data;
    },
  });

  const chartData = (topProducts?.data ?? []).slice(0, 5).map((p) => ({
    name: p.name.slice(0, 20),
    revenue: p.revenue,
  }));

  return (
    <Box mt="xl">
      <Group justify="space-between" mb="md">
        <Title order={3}>Analytics</Title>
        <SegmentedControl
          data={[
            { value: "7", label: "7 días" },
            { value: "30", label: "30 días" },
            { value: "90", label: "90 días" },
          ]}
          value={range}
          onChange={(value) => setRange(value as "7" | "30" | "90")}
        />
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mb="md">
        <MetricCard label="Ingresos" value={`$${(sales?.totalRevenue ?? 0).toLocaleString()}`} />
        <MetricCard label="Órdenes" value={sales?.totalOrders ?? 0} />
        <MetricCard label="Ticket promedio" value={`$${(sales?.averageOrderValue ?? 0).toLocaleString()}`} />
        <MetricCard label="Conversión" value={`${((conversion?.cartToOrderRate ?? 0) * 100).toFixed(1)}%`} />
      </SimpleGrid>

      <Paper p="md" withBorder radius="md" mb="md">
        <Title order={4} mb="md">
          Top productos
        </Title>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={{ stroke: "#E5E5E5" }} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toLocaleString()}`} />
              <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, "Ingresos"]} />
              <Bar dataKey="revenue" fill="#000000" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Text ta="center" c="dimmed" py="xl">
            No hay datos suficientes.
          </Text>
        )}
      </Paper>

      <Paper p="md" withBorder radius="md">
        <Table withTableBorder striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Producto</Table.Th>
              <Table.Th>Cantidad</Table.Th>
              <Table.Th>Ingresos</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(topProducts?.data ?? []).map((p) => (
              <Table.Tr key={p.productId}>
                <Table.Td>{p.name}</Table.Td>
                <Table.Td>{p.quantity}</Table.Td>
                <Table.Td>${p.revenue.toLocaleString()}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    </Box>
  );
}

function MetricCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text size="2xl" fw={700} mt="xs">
        {value}
      </Text>
    </Paper>
  );
}

