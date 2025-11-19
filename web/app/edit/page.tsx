import Link from "next/link";
import { Button } from "@/components/ui/button";
import { adminRoutes } from "@/data/admin-routes";

export default function EditHome() {
  return (
    <article className="max-w-2xl mx-auto py-10">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold tracking-tight mb-2">
          Edit & Manage
        </h2>
      </div>
      <div className="space-y-8">
        {adminRoutes.map((section) => {
          const SectionIcon = section.Icon;
          return (
            <section key={section.label}>
              <h2 className="ml-4 text-xl font-semibold flex items-center gap-2 mb-2">
                {SectionIcon && <SectionIcon className="w-5 h-5" />}
                {section.label}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {section.children?.map((action) => {
                  const ActionIcon = action.Icon;
                  return (
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="justify-start gap-3 w-[250px] mx-auto"
                      key={action.path}
                    >
                      <Link href={action.path}>
                        {ActionIcon && <ActionIcon className="w-5 h-5" />}
                        <span className="text-lg font-medium">
                          {action.label}
                        </span>
                      </Link>
                    </Button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </article>
  );
}
