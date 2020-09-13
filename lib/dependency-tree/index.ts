import { eventLoopSpinner } from "event-loop-spinner";

export async function buildTree(
  targetImage: string,
  depType,
  depInfosList,
  targetOS,
) {
  // A tag can only occur in the last section of a docker image name, so
  // check any colon separator after the final '/'. If there are no '/',
  // which is common when using Docker's official images such as
  // "debian:stretch", just check for ':'
  const finalSlash = targetImage.lastIndexOf("/");
  const hasVersion =
    (finalSlash >= 0 && targetImage.slice(finalSlash).includes(":")) ||
    targetImage.includes(":");

  // Defaults for simple images from dockerhub, like "node" or "centos"
  let imageName = targetImage;
  let imageVersion = "latest";

  // If we have a version, split on the last ':' to avoid the optional
  // port on a hostname (i.e. localhost:5000)
  if (hasVersion) {
    const versionSeparator = targetImage.lastIndexOf(":");
    imageName = targetImage.slice(0, versionSeparator);
    imageVersion = targetImage.slice(versionSeparator + 1);
  }

  if (imageName.endsWith(".tar")) {
    imageVersion = "";
  }

  const shaString = "@sha256";

  if (imageName.endsWith(shaString)) {
    imageName = imageName.slice(0, imageName.length - shaString.length);
    imageVersion = "";
  }

  const root = {
    // don't use the real image name to avoid scanning it as an issue
    name: "docker-image|" + imageName,
    version: imageVersion,
    targetOS,
    packageFormatVersion: depType + ":0.0.1",
    dependencies: {},
  };

  const depsMap = depInfosList.reduce((acc, depInfo) => {
    const name = depInfo.Name;
    acc[name] = depInfo;
    return acc;
  }, {});

  const virtualDepsMap = depInfosList.reduce((acc, depInfo) => {
    const providesNames = depInfo.Provides || [];
    for (const name of providesNames) {
      acc[name] = depInfo;
    }
    return acc;
  }, {});

  const depsCounts = {};
  for (const depInfo of depInfosList) {
    await countDepsRecursive(
      depInfo.Name,
      new Set(),
      depsMap,
      virtualDepsMap,
      depsCounts,
    );
  }
  const DEP_FREQ_THRESHOLD = 100;
  const tooFrequentDepNames = Object.keys(depsCounts).filter((depName) => {
    return depsCounts[depName] > DEP_FREQ_THRESHOLD;
  });

  const attachDeps = async (depInfos) => {
    const depNamesToSkip = new Set(tooFrequentDepNames);
    for (const depInfo of depInfos) {
      const subtree = await buildTreeRecursive(
        depInfo.Name,
        new Set(),
        depsMap,
        virtualDepsMap,
        depNamesToSkip,
      );
      if (subtree) {
        root.dependencies[subtree.name] = subtree;
      }
    }
  };

  // attach (as direct deps) pkgs not marked auto-installed:
  const manuallyInstalledDeps = depInfosList.filter((depInfo) => {
    return !depInfo.AutoInstalled;
  });
  await attachDeps(manuallyInstalledDeps);

  // attach (as direct deps) pkgs marked as auto-insatalled,
  //  but not dependant upon:
  const notVisitedDeps = depInfosList.filter((depInfo) => {
    const depName = depInfo.Name;
    return !depsMap[depName]._visited;
  });
  await attachDeps(notVisitedDeps);

  // group all the "too frequest" deps under a meta package:
  if (tooFrequentDepNames.length > 0) {
    const tooFrequentDeps = tooFrequentDepNames.map((name) => {
      return depsMap[name];
    });

    const metaSubtree = {
      name: "meta-common-packages",
      version: "meta",
      dependencies: {},
    };

    for (const depInfo of tooFrequentDeps) {
      const pkg = {
        name: depFullName(depInfo),
        version: depInfo.Version,
      };
      metaSubtree.dependencies[pkg.name] = pkg;
    }

    root.dependencies[metaSubtree.name] = metaSubtree;
  }

  return root;
}

async function buildTreeRecursive(
  depName,
  ancestors,
  depsMap,
  virtualDepsMap,
  depNamesToSkip,
) {
  if (eventLoopSpinner.isStarving()) {
    await eventLoopSpinner.spin();
  }

  const depInfo = depsMap[depName] || virtualDepsMap[depName];
  if (!depInfo) {
    return null;
  }

  // "realName" as the argument depName might be a virtual pkg
  const realName = depInfo.Name;
  const fullName = depFullName(depInfo);
  if (ancestors.has(fullName) || depNamesToSkip.has(realName)) {
    return null;
  }

  const tree: {
    name: string;
    version: string;
    dependencies?: any;
  } = {
    name: fullName,
    version: depInfo.Version,
  };
  if (depInfo._visited) {
    return tree;
  }
  depInfo._visited = true;

  const newAncestors = new Set(ancestors).add(fullName);

  const deps = depInfo.Deps || {};
  for (const name of Object.keys(deps)) {
    const subTree = await buildTreeRecursive(
      name,
      newAncestors,
      depsMap,
      virtualDepsMap,
      depNamesToSkip,
    );
    if (subTree) {
      if (!tree.dependencies) {
        tree.dependencies = {};
      }
      if (!tree.dependencies[subTree.name]) {
        tree.dependencies[subTree.name] = subTree;
      }
    }
  }

  return tree;
}

async function countDepsRecursive(
  depName,
  ancestors,
  depsMap,
  virtualDepsMap,
  depCounts,
) {
  if (eventLoopSpinner.isStarving()) {
    await eventLoopSpinner.spin();
  }

  const depInfo = depsMap[depName] || virtualDepsMap[depName];
  if (!depInfo) {
    return;
  }

  // "realName" as the argument depName might be a virtual pkg
  const realName = depInfo.Name;
  if (ancestors.has(realName)) {
    return;
  }

  depCounts[realName] = (depCounts[realName] || 0) + 1;

  const newAncestors = new Set(ancestors).add(realName);
  const deps = depInfo.Deps || {};
  for (const name of Object.keys(deps)) {
    countDepsRecursive(name, newAncestors, depsMap, virtualDepsMap, depCounts);
  }
}

function depFullName(depInfo) {
  let fullName = depInfo.Name;
  if (depInfo.Source) {
    fullName = depInfo.Source + "/" + fullName;
  }
  return fullName;
}
