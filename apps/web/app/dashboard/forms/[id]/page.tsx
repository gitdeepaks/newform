import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

type FormBuilderPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function FormBuilderPage({ params }: FormBuilderPageProps) {
  const { id } = await params;

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div>
            <h1 className="text-2xl font-semibold">Form builder</h1>
            <p className="text-sm text-muted-foreground">Editing form {id}</p>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
