import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

const meta = {
  title: "Components/Card",
  component: Card,
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-[380px]">
      <CardHeader>
        <CardTitle>Project Roadmap</CardTitle>
        <CardDescription>Q4 deliverables and track status</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">7 out of 10 tasks completed. On track for release.</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>View Project</Button>
      </CardFooter>
    </Card>
  ),
};

export const Simple: Story = {
  render: () => (
    <Card className="w-[300px] p-4">
      <p className="text-sm font-medium">Simple Card Content</p>
    </Card>
  ),
};
