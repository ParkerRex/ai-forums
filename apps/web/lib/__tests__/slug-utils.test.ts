import { memberProfileUrl } from "../slug-utils";
import { Id } from "@/convex/_generated/dataModel";

describe("memberProfileUrl", () => {
  it("should generate correct URL from member slug", () => {
    const member = {
      slug: "john-doe",
      _id: "member123" as Id<"members">
    };

    const url = memberProfileUrl(member);
    expect(url).toBe("/members/john-doe");
  });

  it("should handle slugs with hyphens and numbers", () => {
    const member = {
      slug: "jane-smith-2",
      _id: "member456" as Id<"members">
    };

    const url = memberProfileUrl(member);
    expect(url).toBe("/members/jane-smith-2");
  });

  it("should handle single character slugs", () => {
    const member = {
      slug: "a",
      _id: "member789" as Id<"members">
    };

    const url = memberProfileUrl(member);
    expect(url).toBe("/members/a");
  });
}); 